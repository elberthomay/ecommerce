import { NextFunction, Request, Response, Router } from "express";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import Item, { ItemCreationAttribute } from "../models/Item";
import validator from "../middlewares/validator";
import catchAsync from "../middlewares/catchAsync";
import Tag from "../models/Tag";
import authenticate from "../middlewares/authenticate";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import { TokenTypes } from "../types/TokenTypes";
import authorize, { authorization } from "../middlewares/authorize";
import {
  itemCreateSchema,
  itemParamSchema,
  itemQuerySchema,
  itemTagEditSchema,
  itemUpdateSchema,
} from "../schemas.ts/itemSchema";
import {
  ItemCreateType,
  ItemQueryType,
  ItemTagEditType,
  ItemUpdateType,
} from "../types/itemTypes";
import {
  FindOptions,
  Includeable,
  Op,
  Sequelize,
  Transaction,
} from "sequelize";
import orderNameEnum from "../var/orderNameEnum";
import User from "../models/User";
import { omit } from "lodash";
import sequelize from "../models/sequelize";
import ItemTag from "../models/ItemTag";
import queryOptionToLimitOffset from "../helper/queryOptionToLimitOffset";

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

async function removeTags(item: Item, tagIds: number[]) {
  await ItemTag.destroy({
    where: { itemId: item.id, tagId: tagIds },
  });
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
  }),
  (req: Request, res: Response, next: NextFunction) => {
    const item = (req as any)[Item.name];
    res.json(item);
  }
);

/** get list of item and the count, optionally receive limit and page to handle pagination */
router.get(
  "/",
  validator({ query: itemQuerySchema }),
  catchAsync(
    async (
      req: Request<unknown, unknown, unknown, ItemQueryType>,
      res: Response,
      next: NextFunction
    ) => {
      const options = req.query;

      const include: Includeable[] = [
        { model: Shop, attributes: ["id", "name"] },
      ];

      if (options.tagIds)
        include.push({
          model: Tag,
          where: { id: { [Op.in]: options.tagIds.split(",") } },
        });

      const findOption: FindOptions<ItemCreationAttribute> = {
        ...queryOptionToLimitOffset(options),
        attributes: ["id", "name", "price", "quantity"],
        include,
        // order: [["inStock", "DESC"]],
        order: [[sequelize.literal("(quantity != 0)"), "DESC"]],
      };

      if (options.search) {
        findOption.where = Sequelize.literal(
          "MATCH(item.name) AGAINST(:name IN NATURAL LANGUAGE MODE)"
        );
        findOption.replacements = { name: options.search };
      }

      if (options.orderBy)
        (findOption.order as any[]).push(orderNameEnum[options.orderBy]);

      const items = await Item.findAndCountAll(findOption);
      const result = {
        ...items,
        rows: items.rows.map(({ id, name, price, quantity, shop }) => ({
          id,
          name,
          price,
          quantity,
          shopId: shop?.id,
          shopName: shop?.name,
        })),
      };
      res.json(result);
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
      //transaction to prevent created item with incomplete tags
      const newItem = await sequelize.transaction(async (transaction) => {
        const newItem = await Item.create(
          {
            ...omit(newItemData, "tags"),
            shopId: shop.id,
          },
          { transaction }
        );
        if (newItemData.tags && newItemData.tags.length !== 0)
          await addTags(newItem, newItemData.tags, transaction);
        return newItem;
      });
      await newItem.reload({ include: [Tag] });
      res.status(201).json(newItem);
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
    async (req: Request<unknown, unknown, ItemTagEditType>, res, next) => {
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
    async (req: Request<unknown, unknown, ItemTagEditType>, res, next) => {
      const item: Item = (req as any)[Item.name];
      const tags = req.body.tags;
      await removeTags(item, tags);
      await item.reload({ include: [Tag] });
      res.json(item);
    }
  )
);

export default router;
