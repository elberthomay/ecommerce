import { Request, Response, NextFunction, Router } from "express";
import authenticate from "../middlewares/authenticate";
import catchAsync from "../middlewares/catchAsync";
import validator from "../middlewares/validator";
import {
  addItemSchema,
  addItemType as AddItemType,
  editItemSchema,
  editItemType,
  itemIdSchema,
  shopActivateSchema,
  shopActivateType as ShopActivateType,
  shopIdSchema,
  shopItemQuerySchema,
} from "../schemas.ts/shopSchema";
import User, { UserCreationAttribute } from "../models/User";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import fetch from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import { AuthorizationError } from "../errors/AuthorizationError";
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
  validator({ params: shopIdSchema, query: shopItemQuerySchema }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const options: { limit?: number; page?: number } = req.query;
    const limit = options.limit ?? 80;
    const offset = options.page ? (options.page - 1) * limit : 0;
    const shopId = req.params.shopId;
    const items = await Item.findAll({ where: { shopId }, limit, offset });
    res.json(items);
  })
);

router.post(
  "/",
  authenticate(true),
  validator({ body: shopActivateSchema }),
  fetch<ShopCreationAttribute, TokenTypes>({
    model: Shop,
    key: ["userId", "id"],
    location: "tokenData",
    force: "absent",
  }),
  fetch<ShopCreationAttribute, ShopActivateType>({
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
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const shopData = req.body as ShopActivateType;
    const userId = ((req as any).currentUser as User).id;
    await Shop.create({ ...shopData, userId });
    res.json({ status: "success" });
  })
);

router.post(
  "/item",
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
    const newItemData = req.body as AddItemType;
    const newItem = await Item.create({ ...newItemData, shopId: shop.id });
    res.json(newItem);
  })
);

router.patch(
  "/item/:itemId",
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
  "/item/:itemId",
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
