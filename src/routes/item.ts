import { NextFunction, Request, Response, Router } from "express";
import fetch from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import validator from "../middlewares/validator";
import {
  addItemSchema,
  addItemType,
  editItemSchema,
  editItemType,
  itemIdSchema,
  itemQuerySchema,
  paginationQuerySchema,
} from "../schemas.ts/shopSchema";
import catchAsync from "../middlewares/catchAsync";
import Tag from "../models/Tag";
import authenticate from "../middlewares/authenticate";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import { TokenTypes } from "../types/TokenTypes";
import authorize from "../middlewares/authorize";

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
  validator({ params: itemIdSchema }),
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
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const queryData: { limit?: number; page?: number; tagId?: number } =
      req.query;
    const limit = queryData.limit ?? 80;
    const offset = queryData.page ? (queryData.page - 1) * limit : 0;
    const queryOption = {
      limit,
      offset,
      include: queryData.tagId
        ? [{ model: Tag, where: { id: queryData.tagId } }]
        : undefined,
    };
    const items = await Item.findAll(queryOption);
    res.json(items);
  })
);

router.post(
  "/",
  authenticate(true),
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "exist",
  }),
  validator({ body: addItemSchema }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const shop = (req as any)[Shop.name];
    const newItemData = req.body as addItemType;
    const newItem = await Item.create({ ...newItemData, shopId: shop.id });
    res.json(newItem);
  })
);

router.patch(
  "/:itemId",
  authenticate(true),
  validator({ params: itemIdSchema, body: editItemSchema }),
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: "exist",
    include: [Shop],
  }),
  compareUserIdToShopUserId,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const changes: editItemType = (req as any).body;
    const item: Item = (req as any)[Item.name];
    await item.set(changes).save();
    res.json({ status: "success" });
  })
);

router.delete(
  "/:itemId",
  authenticate(true),
  validator({ params: itemIdSchema }),
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
