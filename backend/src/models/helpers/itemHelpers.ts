import {
  FindOptions,
  Includeable,
  Op,
  Order,
  Sequelize,
  WhereOptions,
} from "sequelize";
import Item, { ItemAttribute } from "../Item";
import ItemImage from "../ItemImage";
import Shop from "../Shop";
import Tag from "../Tag";
import { z } from "zod";
import {
  itemDetailsOutputSchema,
  itemGetOutputBase,
  orderNameEnum,
} from "@elycommerce/common";
import { omit } from "lodash";
import sequelize from "../sequelize";

export const itemDetailQueryOption: FindOptions<ItemAttribute> = {
  include: [
    { model: ItemImage, attributes: ["imageName", "order"] },
    { model: Shop, attributes: ["id", "name", "userId"] },
    { model: Tag, attributes: ["id", "name"] },
  ],
  order: [
    ["images", "order", "ASC"],
    ["tags", "id", "ASC"],
  ],
};

export const createGetItemQueryOption = ({
  shopId,
  search: itemName,
  limit = 80,
  page = 1,
  orderBy,
  tagIds,
}: {
  shopId?: string;
  search?: string;
  limit?: number;
  page?: number;
  orderBy?: keyof typeof orderNameEnum;
  tagIds?: string[];
}) => {
  // load shop name and first image
  const include: Includeable[] = [
    { model: Shop, attributes: ["name"] },
    {
      model: ItemImage,
      attributes: ["imageName", "order"],
      where: { order: 0 },
      required: false,
    },
  ];

  const order: Order = [[sequelize.literal("(quantity != 0)"), "DESC"]];

  const where: WhereOptions<ItemAttribute> = [];

  if (tagIds)
    include.push({
      model: Tag,
      where: { id: { [Op.in]: tagIds.map((tag) => Number(tag)) } },
    });

  if (orderBy) order.push(orderNameEnum[orderBy]);

  if (itemName)
    where.push(
      Sequelize.literal(
        `MATCH(${Item.name}.name) AGAINST(:name IN NATURAL LANGUAGE MODE)`
      )
    );

  if (shopId) where.push({ shopId });

  return {
    include,
    where: where.length > 0 ? { [Op.and]: where } : undefined,
    replacements: itemName ? { name: itemName } : undefined,
    order,
    limit,
    offset: limit * (page - 1),
  };
};

export function formatItemDetailOutput(
  itemData: ItemAttribute
): z.infer<typeof itemDetailsOutputSchema> {
  const filteredData = omit(itemData, [
    "updatedAt",
    "createdAt",
    "shop",
    "version",
  ]);
  const { images, tags, shop } = itemData;

  if (images === undefined || tags === undefined || shop === undefined)
    throw new Error(
      "item.formatItemDetailOutput: properties not eagerly loaded"
    );

  const result = {
    ...filteredData,
    shopName: shop.name,
    images,
    tags,
  };
  return result;
}

export function formatGetItemOutput(
  itemData: ItemAttribute
): z.infer<typeof itemGetOutputBase> {
  const filteredData = omit(itemData, [
    "createdAt",
    "updatedAt",
    "images",
    "shop",
    "tags",
    "description",
  ]);
  const { images, shop } = itemData;
  if (images === undefined || shop === undefined)
    throw new Error("item.formatGetItemOutput: properties not eagerly loaded");

  return {
    ...filteredData,
    shopName: shop.name,
    image: images[0]?.imageName ?? null,
  };
}
