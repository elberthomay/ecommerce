import { Request, Response, NextFunction, Router } from "express";
import authenticate from "../middlewares/authenticate";
import catchAsync from "../middlewares/catchAsync";
import validator from "../middlewares/validator";
import {
  ShopQuerySchema,
  shopCreateSchema,
  shopNameCheckSchema,
  shopParamSchema,
  shopUpdateSchema,
} from "../schemas/shopSchema";
import User from "../models/User";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import { ParamsDictionary } from "express-serve-static-core";
import { TokenTypes } from "../types/TokenTypes";
import { FindOptions, Op, Order, Sequelize } from "sequelize";
import orderNameEnum from "../var/orderNameEnum";
import queryOptionToLimitOffset from "../helper/queryOptionToLimitOffset";
import sequelize from "../models/sequelize";
import DuplicateDataError from "../errors/DuplicateDataError";
import { authorization } from "../middlewares/authorize";
import ItemImage from "../models/ItemImage";
import processImage from "../middlewares/processImage";
import { v4 as uuid } from "uuid";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME } from "../var/constants";
import s3Client from "../helper/s3Client";
import { z } from "zod";
import { shopItemGetOutputSchema } from "../schemas/itemSchema";

const router = Router();

const authorizeStaffOrOwner = authorization(
  [
    0,
    1,
    (req: Request) => {
      const currentUser: User = (req as any).currentUser;
      const shop: Shop = (req as any)[Shop.name];
      return shop && currentUser && shop.userId === currentUser.id;
    },
  ],
  "shop"
);

/**
 * GET list of item from provided shopId
 * Param: shopId
 * Query:
 *   limit: max number of item returned
 *   page: page of item
 * Authorization: not required
 */
router.get(
  "/:shopId/item",
  validator({ params: shopParamSchema, query: ShopQuerySchema }),
  catchAsync(
    async (
      req: Request<
        z.infer<typeof shopParamSchema> | ParamsDictionary,
        unknown,
        unknown,
        z.infer<typeof ShopQuerySchema>
      >,
      res: Response<z.infer<typeof shopItemGetOutputSchema>>,
      next: NextFunction
    ) => {
      const options = req.query;
      const { orderBy, search } = options;
      const shopId = req.params.shopId;

      const defaultOrder: Order = [
        [sequelize.literal("(quantity != 0)"), "DESC"],
      ];

      const findOption: FindOptions<ItemCreationAttribute> = {
        ...queryOptionToLimitOffset(options),
        include: [
          {
            model: ItemImage,
            attributes: ["imageName", "order"],
            where: { order: 0 },
            required: false,
          },
        ],
        attributes: ["id", "name", "price", "quantity", "createdAt"],
        where: search
          ? Sequelize.and(
              Sequelize.literal(
                `MATCH(${Item.name}.name) AGAINST(:name IN NATURAL LANGUAGE MODE)`
              ),
              { shopId }
            )
          : { shopId },
        order: orderBy
          ? [...defaultOrder, orderNameEnum[orderBy]]
          : defaultOrder,
        replacements: search ? { name: search } : undefined,
      };

      const items = await Item.findAndCountAll(findOption);
      const result = {
        ...items,
        rows: items.rows.map(({ id, name, price, quantity, images }) => ({
          id,
          name,
          price,
          quantity,
          image: images[0]?.imageName ?? null,
        })),
      };
      res.json(result);
    }
  )
);

router.get(
  "/checkName/:name",
  validator({ params: shopNameCheckSchema }),
  fetch<ShopCreationAttribute, z.infer<typeof shopNameCheckSchema>>({
    model: Shop,
    key: "name",
    location: "params",
  }),
  (req: Request, res: Response, next: NextFunction) => {
    const shop: Shop | undefined = (req as any)[Shop.name];

    res.status(200).json({ exist: !!shop });
  }
);

router.get(
  "/myShop/",
  authenticate(true),
  fetchCurrentUser,
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
  }),
  (req: Request, res: Response, next: NextFunction) => {
    const shop: Shop = (req as any)[Shop.name];
    if (shop) res.status(200).json(shop);
    else res.status(200).json({});
  }
);

/** get shop */
router.get(
  "/:shopId",
  validator({ params: shopParamSchema }),
  //shop must exist
  fetch<ShopCreationAttribute, z.infer<typeof shopParamSchema>>({
    model: Shop,
    key: ["id", "shopId"],
    location: "params",
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<ParamsDictionary | z.infer<typeof shopParamSchema>>,
      res: Response,
      next: NextFunction
    ) => {
      const shop: Shop = (req as any)[Shop.name];
      res.status(200).json(shop);
    }
  )
);

/** activate shop */
router.post(
  "/",
  authenticate(true),

  validator({ body: shopCreateSchema }),
  //check if user already has shop
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "absent",
  }),
  //check name duplicate
  fetch<ShopCreationAttribute, z.infer<typeof shopCreateSchema>>({
    model: Shop,
    key: "name",
    location: "body",
    force: "absent",
  }),
  fetchCurrentUser,
  catchAsync(
    async (
      req: Request<ParamsDictionary, unknown, z.infer<typeof shopCreateSchema>>,
      res: Response,
      next: NextFunction
    ) => {
      const shopData = req.body;
      const currentUser: User = (req as any).currentUser;
      const newShop = await currentUser.$create("shop", shopData);
      res.status(201).json(newShop);
    }
  )
);

/** update shop */
router.patch(
  "/:shopId",
  authenticate(true),
  validator({ params: shopParamSchema, body: shopUpdateSchema }),
  //user must have a shop
  fetch<ShopCreationAttribute, z.infer<typeof shopParamSchema>>({
    model: Shop,
    key: ["id", "shopId"],
    location: "params",
    force: "exist",
  }),
  fetchCurrentUser,
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<ParamsDictionary, unknown, z.infer<typeof shopUpdateSchema>>,
      res: Response,
      next: NextFunction
    ) => {
      const shopUpdateData = req.body;
      const shop: Shop = (req as any)[Shop.name];

      if (shopUpdateData.name) {
        const duplicateName = await Shop.findOne({
          where: { name: shopUpdateData.name },
        });
        if (duplicateName) throw new DuplicateDataError("name");
      }
      const updatedShop = await shop.update(shopUpdateData);
      res.status(200).json(updatedShop);
    }
  )
);

router.post(
  "/avatar",
  authenticate(true),
  fetchCurrentUser,
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "exist",
  }),
  processImage("hasPicture", 1),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const shop: Shop = (req as any)[Shop.name];
    const images = req.files as Express.Multer.File[];
    const imageName = `${uuid()}.webp`;
    const currentAvatar = shop.avatar ?? "undefined";

    await Promise.all(
      [
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: imageName,
          Body: images[0].buffer,
        }),
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: currentAvatar,
        }),
      ].map((command) => s3Client.send(command))
    );

    await shop.update({ avatar: imageName });
    res.status(200).json({ status: "success" });
  })
);

export default router;
