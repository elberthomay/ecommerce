import { NextFunction, Request, Response, Router } from "express";
import { v4 as uuid } from "uuid";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import validator from "../middlewares/validator";
import catchAsync from "../middlewares/catchAsync";
import Tag from "../models/Tag";
import authenticate from "../middlewares/authenticate";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import { TokenTypes } from "../types/TokenTypes";
import { authorization } from "../middlewares/authorize";
import {
  itemCreateSchema,
  itemGetOutputSchema,
  itemImageOrdersSchema,
  itemParamSchema,
  itemQuerySchema,
  itemTagEditSchema,
  itemUpdateSchema,
} from "@elycommerce/common";
import { Transaction } from "sequelize";
import User from "../models/User";
import { omit } from "lodash";
import sequelize from "../models/sequelize";
import ItemTag from "../models/ItemTag";
import processImage from "../middlewares/processImage";
import { BUCKET_NAME } from "../var/constants";
import { MAX_IMAGE_COUNT } from "@elycommerce/common";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../helper/s3Client";
import { z } from "zod";
import {
  createGetItemQueryOption,
  formatGetItemOutput,
  formatItemDetailOutput,
  itemDetailQueryOption,
} from "../models/helpers/itemHelpers";
import {
  addImages,
  deleteImages,
  reorderImages,
} from "../models/helpers/itemImageHelpers";
import ValidationError from "../errors/ValidationError";
import ValidationMessageError from "../errors/ValidationMessageError";

const router = Router();

const authorizeStaffOrOwner = authorization(
  [
    0,
    1,
    (req: Request) => {
      const currentUser: User | null | undefined = (req as any).currentUser;
      const shop = ((req as any)[Item.name] as Item)?.shop;
      return currentUser?.id === shop?.userId && !!currentUser;
    },
  ],
  "Item"
);

async function addTags(
  item: Item,
  tagIds: number[],
  transaction?: Transaction
) {
  const tags = await Promise.all(tagIds.map((tagId) => Tag.findByPk(tagId)));
  const existingTag: Tag[] = tags.filter((tag) => tag !== null) as Tag[];

  await ItemTag.bulkCreate(
    existingTag.map((tag) => ({ itemId: item.id, tagId: tag.id })),
    { transaction, ignoreDuplicates: true }
  );
}

async function addImagesS3(images: { data: Buffer; name: string }[]) {
  if (images.length !== 0) {
    const commandList = images.map(
      ({ name, data }) =>
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: name,
          Body: data,
        })
    );

    await Promise.all(commandList.map((command) => s3Client.send(command)));
  }
}

async function deleteImagesS3(imagesToDelete: string[]) {
  if (imagesToDelete.length !== 0) {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: imagesToDelete.map((name) => ({ Key: name })),
      },
    });

    await s3Client.send(deleteCommand);
  }
}

async function removeTags(item: Item, tagIds: number[]) {
  await ItemTag.destroy({
    where: { itemId: item.id, tagId: tagIds },
  });
}

/** get item detail by itemId */
router.get(
  "/:itemId",
  validator({ params: itemParamSchema }),
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    ...itemDetailQueryOption,
  }),
  (req: Request, res: Response) => {
    const item: Item = (req as any)[Item.name];
    const result = formatItemDetailOutput(item.toJSON());
    res.json(result);
  }
);

/** get list of item and the count, optionally receive limit and page to handle pagination */
router.get(
  "/",
  validator({ query: itemQuerySchema }),
  catchAsync(
    async (
      req: Request<unknown, unknown, unknown, z.infer<typeof itemQuerySchema>>,
      res: Response<z.infer<typeof itemGetOutputSchema>>
    ) => {
      const items = await Item.findAndCountAll(
        createGetItemQueryOption(req.query)
      );
      const result = {
        count: items.count,
        rows: items.rows.map((item) => formatGetItemOutput(item.toJSON())),
      };

      res.json(result);
    }
  )
);

//create item
router.post(
  "/",
  authenticate(true),

  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "exist",
  }),
  processImage(false, MAX_IMAGE_COUNT),
  validator({ body: itemCreateSchema }),
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemCreateSchema>>,
      res: Response,
      next: NextFunction
    ) => {
      const itemShop = (req as any)[Shop.name];
      const imageBuffers: Buffer[] = req.files
        ? (req.files as Express.Multer.File[]).map((image) => image.buffer)
        : [];

      const newItemData = req.body;

      //transaction to prevent created item with incomplete tags or image
      const newItem = await sequelize.transaction(async (transaction) => {
        //create item
        const newItem = await Item.create(
          {
            ...omit(newItemData, "tags"),
            shopId: itemShop.id,
          },
          { transaction }
        );

        //set tags if specified
        if (newItemData.tags)
          await addTags(newItem, newItemData.tags, transaction);

        //set images if specified
        if (imageBuffers.length !== 0) {
          const newImageItems = imageBuffers.map((buffer) => ({
            data: buffer,
            name: `${uuid()}.webp`,
          }));
          await addImages(
            newItem,
            newImageItems.map(({ name }) => name),
            transaction
          );
          await addImagesS3(newImageItems);
        }

        //return new item
        return newItem;
      });
      await newItem.reload(itemDetailQueryOption); //full reload
      const result = formatItemDetailOutput(newItem.toJSON());
      res.status(201).json(result);
    }
  )
);

router.patch(
  "/:itemId",
  authenticate(true),
  processImage(false, MAX_IMAGE_COUNT), // image is optional, json body allowed
  validator({ params: itemParamSchema, body: itemUpdateSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemUpdateSchema>>,
      res: Response
    ) => {
      const item: Item = (req as any)[Item.name];
      const updateBody = omit(req.body, ["imageDelete", "imageReorder"]);
      //@ts-ignore
      const { imagesDelete, imagesReorder } = req.body;

      const imageBuffers: Buffer[] = req.files
        ? (req.files as Express.Multer.File[]).map((image) => image.buffer)
        : [];

      if (Object.keys(req.body).length === 0 && imageBuffers.length === 0)
        throw new ValidationMessageError("No update property specified");
      await sequelize.transaction(async (transaction) => {
        //lock items and it's images and tags
        await item.reload({
          ...itemDetailQueryOption,
          transaction,
          lock: true,
        });

        //body update
        const propertyCount = Object.keys(updateBody).length;
        if (propertyCount !== 0)
          await item.set(updateBody).save({ transaction });

        //image delete
        if (imagesDelete) {
          const deletedImages = await deleteImages(
            item,
            imagesDelete,
            transaction
          );
          await deleteImagesS3(deletedImages.map((img) => img.imageName));
        }

        //image add
        if (imageBuffers.length !== 0) {
          const newImages = imageBuffers.map((buffer) => ({
            data: buffer,
            name: `${uuid()}.webp`,
          }));
          await addImages(
            item,
            newImages.map(({ name }) => name),
            transaction
          );
          await addImagesS3(newImages);
        }

        //image reorder
        if (imagesReorder)
          await reorderImages(item, imagesReorder, transaction);

        //increments version images updated or properties updated
        //doesn't increment if only quantity is updated
        if (
          imageBuffers.length !== 0 ||
          imagesDelete ||
          imagesReorder ||
          propertyCount >= 2 ||
          Object.keys(updateBody)[0] !== "quantity"
        )
          await item.update({ version: item.version + 1 }, { transaction });
      });

      await item.reload(itemDetailQueryOption);

      const result = formatItemDetailOutput(item.toJSON());
      res.json(result);
    }
  )
);

router.delete(
  "/:itemId",
  authenticate(true),
  validator({ params: itemParamSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const item: Item = (req as any)[Item.name];
    await item.destroy();
    res.json({ status: "success" });
  })
);

router.post(
  "/:itemId/tag",
  authenticate(true),
  validator({ params: itemParamSchema, body: itemTagEditSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemTagEditSchema>>,
      res,
      next
    ) => {
      const item: Item = (req as any)[Item.name];
      const tags = req.body.tags;
      await addTags(item, tags);
      await item.reload({ include: [Tag] });
      res.json(item);
    }
  )
);

router.delete(
  "/:itemId/tag",
  authenticate(true),
  validator({ params: itemParamSchema, body: itemTagEditSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemTagEditSchema>>,
      res,
      next
    ) => {
      const item: Item = (req as any)[Item.name];
      const tags = req.body.tags;
      await removeTags(item, tags);
      await item.reload({ include: [Tag] });
      res.json(item);
    }
  )
);

router.post(
  "/:itemId/images",
  authenticate(true),
  processImage("hasPicture", MAX_IMAGE_COUNT),
  validator({ params: itemParamSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (req: Request<unknown, unknown, unknown>, res: Response, next) => {
      const item: Item = (req as any)[Item.name];

      //take buffer out of multer object
      const imageBuffers: Buffer[] = req.files
        ? (req.files as Express.Multer.File[]).map((image) => image.buffer)
        : [];

      //return early if no image
      if (imageBuffers.length === 0)
        return res.status(200).json({ status: "success" });

      await sequelize.transaction(async (transaction) => {
        const newImages = imageBuffers.map((buffer) => ({
          data: buffer,
          name: `${uuid()}.webp`,
        }));
        await addImages(
          item,
          newImages.map(({ name }) => name),
          transaction
        );
        await addImagesS3(newImages);
      });

      //success if addImages resolve
      res.status(200).json({ status: "success" });
    }
  )
);

export default router;

router.patch(
  "/:itemId/images",
  authenticate(true),
  validator({ params: itemParamSchema, body: itemImageOrdersSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemImageOrdersSchema>>,
      res: Response
    ) => {
      const item: Item = (req as any)[Item.name];

      await sequelize.transaction(async (transaction) => {
        await reorderImages(item, req.body, transaction);
      });

      res.status(200).json({ status: "success" });
    }
  )
);

router.delete(
  "/:itemId/images",
  authenticate(true),
  validator({ params: itemParamSchema, body: itemImageOrdersSchema }),
  fetchCurrentUser,
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemImageOrdersSchema>>,
      res: Response
    ) => {
      const item: Item = (req as any)[Item.name];

      await sequelize.transaction(async (transaction) => {
        const destroyedImages = await deleteImages(item, req.body, transaction);
        await deleteImagesS3(destroyedImages.map(({ imageName }) => imageName));
      });

      res.status(200).json({ status: "success" });
    }
  )
);
