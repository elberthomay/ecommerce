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
} from "../schemas.ts/shopSchema";
import User, { UserCreationAttribute } from "../models/User";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import DuplicateDataError from "../errors/DuplicateDataError";
import sequelize from "sequelize";
import DatabaseError from "../errors/DatabaseError";
import fetch from "../middlewares/fetch";
import ShopUnactivatedError from "../errors/ShopUnactivatedError";
import Item, { ItemCreationAttribute } from "../models/Item";
import { AuthorizationError } from "../errors/AuthorizationError";

const router = Router();

router.post(
  "/",
  authenticate(true),
  validator({ body: shopActivateSchema }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = ((req as any).currentUser as UserCreationAttribute).id;

    const existingShop = await Shop.findOne({
      where: {
        userId: userId,
      },
    });
    if (existingShop) throw new DuplicateDataError("Shop");
    next();
  }),
  fetch<ShopCreationAttribute, ShopActivateType>({
    model: Shop,
    key: "name",
    location: "body",
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const shop = (req as any)[Shop.name];
    const shopData = req.body as ShopActivateType;
    const userId = ((req as any).currentUser as UserCreationAttribute).id;
    if (shop) throw new DuplicateDataError("name");
    else {
      await Shop.create({ ...shopData, userId });
      res.json({ status: "success" });
    }
  })
);

router.post(
  "/item",
  authenticate(true),
  validator({ body: addItemSchema }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shop = await ((req as any).currentUser as User).$get("shop");
      const newItemData = req.body as AddItemType;
      if (shop) {
        const newItem = await Item.create({ ...newItemData, shopId: shop.id });
        res.json(newItem);
      } else throw new ShopUnactivatedError();
    } catch (err: any) {
      if (err instanceof sequelize.DatabaseError) {
        throw new DatabaseError(err);
      } else throw err;
    }
  })
);

router.patch(
  "/item/:itemId",
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.params["itemId"]);
    next();
  }),
  authenticate(true),
  validator({ params: itemIdSchema, body: editItemSchema }),
  fetch<ItemCreationAttribute, { itemId: string }>({
    model: Item,
    key: ["id", "itemId"],
    location: "params",
    force: true,
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User = (req as any).currentUser;
    const changes: editItemType = (req as any).body;
    const item: Item = (req as any)[Item.name];
    const shop: Shop = (await item.$get("shop"))!;
    if (currentUser.id === shop.userId) {
      await item.set(changes).save();
      res.json({ status: "success" });
    } else {
      throw new AuthorizationError("item");
    }
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
    force: true,
  }),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User = (req as any).currentUser;
    const item: Item = (req as any)[Item.name];
    const shop: Shop = (await item.$get("shop"))!;
    if (currentUser.id === shop.userId) {
      await item.destroy();
      res.json({ status: "success" });
    } else {
      throw new AuthorizationError("item");
    }
  })
);

export default router;
