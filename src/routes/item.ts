import { NextFunction, Request, Response, Router } from "express";
import fetch from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import validator from "../middlewares/validator";
import {
  itemIdSchema,
  itemQuerySchema,
  paginationQuerySchema,
} from "../schemas.ts/shopSchema";
import catchAsync from "../middlewares/catchAsync";

const router = Router();

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
      where: queryData.tagId ? { tagId: queryData.tagId } : undefined,
    };
    const items = await Item.findAll(queryOption);
    res.json(items);
  })
);

export default router;
