import { Request, Response, NextFunction, Router } from "express";
import authenticate from "../middlewares/authenticate";
import catchAsync from "../middlewares/catchAsync";
import validator from "../middlewares/validator";
import {
  ShopQuerySchema,
  shopCreateSchema,
  shopNameCheckSchema,
  shopParamSchema,
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
} from "../types/shopTypes";
import { Sequelize, Op, FindOptions } from "sequelize";
import orderNameEnum from "../var/orderNameEnum";
import queryOptionToLimitOffset from "../helper/queryOptionToLimitOffset";
import sequelize from "../models/sequelize";

const router = Router();

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
      const shopId = req.params.shopId;

      const findOption: FindOptions<ItemCreationAttribute> = {
        attributes: ["id", "name", "price", "quantity"],
        where: { shopId },
        ...queryOptionToLimitOffset(options),
        order: [[sequelize.literal("(quantity != 0)"), "DESC"]],
      };

      if (options.orderBy)
        (findOption.order as any[]).push(orderNameEnum[options.orderBy]);

      const items = await Item.findAndCountAll(findOption);
      res.json(items);
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
      // const userId = ((req as any).currentUser as User).id;
      // const newShop = await Shop.create({ ...shopData, userId });
      const newShop = await currentUser.$create("shop", shopData);
      res.status(201).json(newShop);
    }
  )
);

export default router;
