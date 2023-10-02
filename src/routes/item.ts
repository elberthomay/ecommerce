import { NextFunction, Request, Response, Router } from "express";
import fetch from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import validator from "../middlewares/validator";
import catchAsync from "../middlewares/catchAsync";
import Tag from "../models/Tag";
import authenticate from "../middlewares/authenticate";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import { TokenTypes } from "../types/TokenTypes";
import authorize from "../middlewares/authorize";
import {
  itemCreateSchema,
  itemParamSchema,
  itemQuerySchema,
  itemUpdateSchema,
} from "../schemas.ts/itemSchema";
import {
  ItemCreateType,
  ItemQueryType,
  ItemUpdateType,
} from "../types/itemTypes";
import { FindOptions, Sequelize } from "sequelize";

const router = Router();

const compareUserIdToShopUserId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const value = ((req as any).tokenData as TokenTypes).id;
  const target = ((req as any)[Item.name] as Item).shop?.userId;
  if (!target) throw new Error("item has no Shop!");
  authorize(value, target);
  next();
};

/** get item detail by itemId */
router.get(
  "/:itemId",
  validator({ params: itemParamSchema }),
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
  }),
  (req: Request, res: Response, next: NextFunction) => {
    const item = (req as any)[Item.name];
    res.json(item);
  }
);

/** get list of item, optionally receive limit and page to handle pagination */
router.get(
  "/",
  validator({ query: itemQuerySchema }),
  catchAsync(
    async (
      req: Request<unknown, unknown, unknown, ItemQueryType>,
      res: Response,
      next: NextFunction
    ) => {
      const queryData = req.query;
      const limit = queryData.limit ?? 80;
      const offset = queryData.page ? (queryData.page - 1) * limit : 0;
      const include = queryData.tagId
        ? [{ model: Tag, where: { id: queryData.tagId } }]
        : undefined;
      const queryOption: FindOptions<ItemCreationAttribute> = {
        limit,
        offset,
        include,
        order: [["inStock", "DESC"]],
      };
      const items = await Item.findAll(queryOption);
      res.json(items);
    }
  )
);

router.post(
  "/",
  authenticate(true),
  validator({ body: itemCreateSchema }),
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<unknown, unknown, ItemCreateType>,
      res: Response,
      next: NextFunction
    ) => {
      const shop = (req as any)[Shop.name];
      const newItemData = req.body;
      const newItem = await Item.create({ ...newItemData, shopId: shop.id });
      res.status(201).json(newItem);
    }
  )
);

router.patch(
  "/:itemId",
  authenticate(true),
  validator({ params: itemParamSchema, body: itemUpdateSchema }),
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  compareUserIdToShopUserId,
  catchAsync(
    async (
      req: Request<unknown, unknown, ItemUpdateType>,
      res: Response,
      next: NextFunction
    ) => {
      const changes = req.body;
      const item: Item = (req as any)[Item.name];
      await item.set(changes).save();
      res.json(item);
    }
  )
);

router.delete(
  "/:itemId",
  authenticate(true),
  validator({ params: itemParamSchema }),
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  compareUserIdToShopUserId,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const item: Item = (req as any)[Item.name];
    await item.destroy();
    res.json({ status: "success" });
  })
);

export default router;
