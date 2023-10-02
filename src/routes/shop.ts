import { Request, Response, NextFunction, Router } from "express";
import authenticate from "../middlewares/authenticate";
import catchAsync from "../middlewares/catchAsync";
import validator from "../middlewares/validator";
import {
  ShopQuerySchema,
  shopCreateSchema,
  shopParamSchema,
} from "../schemas.ts/shopSchema";
import User, { UserCreationAttribute } from "../models/User";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import fetch from "../middlewares/fetch";
import Item from "../models/Item";
import { ParamsDictionary } from "express-serve-static-core";
import { TokenTypes } from "../types/TokenTypes";
import {
  ShopCreateType,
  ShopParamType,
  ShopQueryType,
} from "../types/shopTypes";
import { Sequelize, Op } from "sequelize";

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
      const limit = options.limit ?? 80;
      const offset = options.page ? (options.page - 1) * limit : 0;
      const shopId = req.params.shopId;
      const items = await Item.findAll({
        where: { shopId },
        limit,
        offset,
        order: [["inStock", "DESC"]],
      });
      res.json(items);
    }
  )
);

/** activate shop */
router.post(
  "/",
  authenticate(true),
  validator({ body: shopCreateSchema }),
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "absent",
  }),
  fetch<ShopCreationAttribute, ShopCreateType>({
    model: Shop,
    key: "name",
    location: "body",
    force: "absent",
  }),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    force: "exist",
    destination: "currentUser",
  }),
  catchAsync(
    async (
      req: Request<ParamsDictionary, unknown, ShopCreateType>,
      res: Response,
      next: NextFunction
    ) => {
      const shopData = req.body;
      const userId = ((req as any).currentUser as User).id;
      const newShop = await Shop.create({ ...shopData, userId });
      res.status(201).json(newShop);
    }
  )
);

export default router;
