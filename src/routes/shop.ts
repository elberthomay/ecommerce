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
} from "../schemas.ts/shopSchema";
import User, { UserCreationAttribute } from "../models/User";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import { ParamsDictionary } from "express-serve-static-core";
import { TokenTypes } from "../types/TokenTypes";
import {
  ShopCreateType,
  ShopNameCheckType,
  ShopParamType,
  ShopQueryType,
  ShopUpdateType,
} from "../types/shopTypes";
import { FindOptions, Op, Order, Sequelize } from "sequelize";
import orderNameEnum from "../var/orderNameEnum";
import queryOptionToLimitOffset from "../helper/queryOptionToLimitOffset";
import sequelize from "../models/sequelize";
import DuplicateDataError from "../errors/DuplicateDataError";
import authorize, { authorization } from "../middlewares/authorize";
import ItemImage from "../models/ItemImage";

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
      req: Request<ParamsDictionary, unknown, unknown, ShopQueryType>,
      res: Response,
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
        attributes: ["id", "name", "price", "quantity"],
        where: search
          ? Sequelize.and(
              Sequelize.literal(
                "MATCH(item.name) AGAINST(:name IN NATURAL LANGUAGE MODE)"
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
          image: images[0]?.imageName,
        })),
      };
      res.json(result);
    }
  )
);

router.get(
  "/checkName/:name",
  validator({ params: shopNameCheckSchema }),
  fetch<ShopCreationAttribute, ShopNameCheckType>({
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
    force: "exist",
  }),
  (req: Request, res: Response, next: NextFunction) => {
    const shop: Shop = (req as any)[Shop.name];

    res.status(200).json(shop);
  }
);

/** get shop */
router.get(
  "/:shopId",
  validator({ params: shopParamSchema }),
  //shop must exist
  fetch<ShopCreationAttribute, ShopParamType>({
    model: Shop,
    key: ["id", "shopId"],
    location: "params",
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<ParamsDictionary | ShopParamType>,
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
  fetch<ShopCreationAttribute, ShopCreateType>({
    model: Shop,
    key: "name",
    location: "body",
    force: "absent",
  }),
  fetchCurrentUser,
  catchAsync(
    async (
      req: Request<ParamsDictionary, unknown, ShopCreateType>,
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
  fetch<ShopCreationAttribute, ShopParamType>({
    model: Shop,
    key: ["id", "shopId"],
    location: "params",
    force: "exist",
  }),
  fetchCurrentUser,
  authorizeStaffOrOwner,
  catchAsync(
    async (
      req: Request<ParamsDictionary, unknown, ShopUpdateType>,
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

export default router;
