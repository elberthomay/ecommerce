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
  itemDetailsOutputSchema,
  itemGetOutputSchema,
  itemImageOrdersSchema,
  itemParamSchema,
  itemQuerySchema,
  itemTagEditSchema,
  itemUpdateSchema,
} from "@elycommerce/common";
import {
  FindOptions,
  Includeable,
  Op,
  Order,
  Sequelize,
  Transaction,
} from "sequelize";
import { orderNameEnum } from "@elycommerce/common";
import User from "../models/User";
import { omit, includes, pick } from "lodash";
import sequelize from "../models/sequelize";
import ItemTag from "../models/ItemTag";
import queryOptionToLimitOffset from "../helper/queryOptionToLimitOffset";
import ItemImage from "../models/ItemImage";
import processImage from "../middlewares/processImage";
import ImageError from "../errors/ImageError";
import { BUCKET_NAME } from "../var/constants";
import { MAX_IMAGE_COUNT } from "@elycommerce/common";
import MaxImageExceeded from "../errors/MaxImageExceeded";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../helper/s3Client";
import { z } from "zod";

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

const defaultItemInclude: Includeable[] = [
  {
    model: ItemImage,
  },
  { model: Shop },
  { model: Tag, attributes: ["id", "name"] },
];

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

async function addImages(
  item: Item,
  images: Buffer[],
  transaction?: Transaction,
  order?: z.infer<typeof itemImageOrdersSchema>
) {
  const imagesMetadata = images.map((image, i) => ({
    itemId: item.id,
    imageName: `${uuid()}.webp`,
    order: order ? order[i] : i,
  }));

  const commandList = imagesMetadata.map(
    ({ imageName }, i) =>
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageName,
        Body: images[i],
      })
  );

  await Promise.all(commandList.map((command) => s3Client.send(command)));

  const result = await ItemImage.bulkCreate(imagesMetadata, {
    transaction: transaction ?? null,
  });
}

async function deleteImages(
  imagesToDelete: ItemImage[],
  transaction: Transaction
) {
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: imagesToDelete.map(({ imageName }) => ({ Key: imageName })),
    },
  });

  await s3Client.send(deleteCommand);

  await Promise.all(
    imagesToDelete.map((image) => image.destroy({ transaction }))
  );
}

async function reorderImages(
  images: ItemImage[],
  orders?: number[],
  transaction?: Transaction
) {
  await Promise.all(
    images.map((image, i) =>
      image.update({ order: -image.order }, { transaction })
    )
  );

  await Promise.all(
    images.map((image, i) =>
      image.update({ order: orders ? orders[i] : i }, { transaction })
    )
  );
}

async function removeTags(item: Item, tagIds: number[]) {
  await ItemTag.destroy({
    where: { itemId: item.id, tagId: tagIds },
  });
}

async function formatItemDetailsOutput(
  item: Item
): Promise<z.infer<typeof itemDetailsOutputSchema>> {
  await item.reload({
    include: [
      { model: ItemImage, attributes: ["imageName", "order"] },
      { model: Shop, attributes: ["name"] },
      { model: Tag, attributes: ["id", "name"] },
    ],
  });
  const { id, name, description, price, quantity, shop, shopId, tags, images } =
    item;
  const result = {
    id,
    name,
    description,
    price,
    quantity,
    shopId,
    shopName: shop?.name!,
    tags,
    images,
  };
  return result;
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
    include: defaultItemInclude,
    order: [["images", "order", "ASC"]],
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const item: Item = (req as any)[Item.name];
    const result = await formatItemDetailsOutput(item);
    res.json(result);
  })
);

/** get list of item and the count, optionally receive limit and page to handle pagination */
router.get(
  "/",
  validator({ query: itemQuerySchema }),
  catchAsync(
    async (
      req: Request<unknown, unknown, unknown, z.infer<typeof itemQuerySchema>>,
      res: Response<z.infer<typeof itemGetOutputSchema>>,
      next: NextFunction
    ) => {
      const options = req.query;
      const { tagIds, orderBy, search } = options;
      // load shop name and first image
      const defaultInclude = [
        { model: Shop, attributes: ["id", "name"] },
        {
          model: ItemImage,
          attributes: ["imageName", "order"],
          where: { order: 0 },
          required: false,
        },
      ];
      const defaultOrder: Order = [
        [sequelize.literal("(quantity != 0)"), "DESC"],
      ];

      const findOption: FindOptions<ItemCreationAttribute> = {
        ...queryOptionToLimitOffset(options),
        include: tagIds
          ? [
              ...defaultInclude,
              {
                model: Tag,
                where: { id: { [Op.in]: tagIds } },
              },
            ]
          : defaultInclude,
        // order: [["inStock", "DESC"]],
        order: orderBy
          ? [...defaultOrder, orderNameEnum[orderBy]]
          : defaultOrder,
        where: search
          ? Sequelize.literal(
              `MATCH(${Item.name}.name) AGAINST(:name IN NATURAL LANGUAGE MODE)`
            )
          : undefined,
        replacements: search ? { name: options.search } : undefined,
      };

      const items = await Item.findAndCountAll(findOption);
      const result = {
        ...items,
        rows: items.rows.map(
          ({ id, name, price, quantity, shopId, shop, images }) => ({
            id,
            name,
            price,
            quantity,
            shopId,
            shopName: shop?.name!,
            image: images[0]?.imageName ?? null,
          })
        ),
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
        const newItem = await Item.create(
          {
            ...omit(newItemData, "tags"),
            shopId: itemShop.id,
          },
          { transaction }
        );
        if (newItemData.tags)
          await addTags(newItem, newItemData.tags, transaction);
        if (imageBuffers.length !== 0)
          await addImages(newItem, imageBuffers, transaction);
        return newItem;
      });
      const result = await formatItemDetailsOutput(newItem);
      res.status(201).json(result);
    }
  )
);

router.patch(
  "/:itemId",
  authenticate(true),
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
      res: Response,
      next: NextFunction
    ) => {
      const changes = req.body;
      const item: Item = (req as any)[Item.name];
      await item.set(changes).save();

      const result = await formatItemDetailsOutput(item);
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
    include: defaultItemInclude,
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

      //image more than MAX_IMAGE_COUNT
      if (imageBuffers.length + item.images.length > MAX_IMAGE_COUNT)
        throw new MaxImageExceeded();

      //assign order sequentially after current order
      const newOrder = [...Array(imageBuffers.length).keys()].map(
        (i) => i + item.images.length
      );

      await addImages(item, imageBuffers, undefined, newOrder);

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
    include: defaultItemInclude,
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemImageOrdersSchema>>,
      res: Response,
      next
    ) => {
      let newOrder = [...new Set(req.body).values()];
      const item: Item = (req as any)[Item.name];
      const sortedImages = [...item.images].sort((a, b) => a.order - b.order);

      const invalidLength = newOrder.length !== item.images.length;
      const hasOutOfBound = newOrder.some(
        (order) => order >= item.images.length
      );

      if (hasOutOfBound || invalidLength)
        throw new ImageError("invalid order array");

      // //construct changes, images sorted ASC by default include
      // const changesArray = sortedImages.map((image, i) => ({
      //   itemId: item.id,
      //   imageName: image.imageName,
      //   order: newOrder[i],
      // }));

      await sequelize.transaction(async (transaction) => {
        await reorderImages(sortedImages, newOrder, transaction);
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
    include: defaultItemInclude,
  }),
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof itemImageOrdersSchema>>,
      res: Response,
      next
    ) => {
      const deleteOrder = req.body;
      const item: Item = (req as any)[Item.name];
      const sortedImages = [...item.images].sort((a, b) => a.order - b.order);

      const imagesToDelete = sortedImages.filter((image) =>
        includes(deleteOrder, image.order)
      );
      const remainingImages = sortedImages.filter(
        (image) => !includes(deleteOrder, image.order)
      );

      if (imagesToDelete.length !== 0) {
        const changedImages = await sequelize.transaction(
          async (transaction) => {
            //destroy image
            await deleteImages(imagesToDelete, transaction);

            await reorderImages(remainingImages, undefined, transaction);
          }
        );
      }

      res.status(200).json({ status: "success" });
    }
  )
);
