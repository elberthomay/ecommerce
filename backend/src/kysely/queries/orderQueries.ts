import { db } from "../database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/mysql";
import { getOrdersOption } from "@elycommerce/common";
import { z } from "zod";

enum orderOrderOptions {
  oldest = "Order.createdAt asc",
  newest = "Order.createdAt desc",
}

export const getOrderQuery = (orderId: string) =>
  db
    .selectFrom("Order")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .selectAll("Order")
    .select(["Shop.name as shopName"])
    .where("Order.id", "=", orderId);

export const getFullOrderQuery = (orderId: string) =>
  db
    .selectFrom("Order")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .selectAll("Order")
    .select((eb) => [
      "Shop.name as shopName",
      jsonArrayFrom(
        eb
          .selectFrom("OrderOrderItem")
          .innerJoin("OrderItem", (join) =>
            join
              .onRef("OrderOrderItem.orderId", "=", "Order.id")
              .onRef("OrderOrderItem.itemId", "=", "OrderItem.id")
              .onRef("OrderOrderItem.version", "=", "OrderItem.version")
          )
          .select((eb) => [
            "id",
            "name",
            "price",
            "quantity",
            jsonArrayFrom(
              eb
                .selectFrom("OrderItemImage")
                .select(["imageName", "order"])
                .whereRef("OrderItemImage.itemId", "=", "OrderItem.id")
                .whereRef("OrderItemImage.version", "=", "OrderItem.version")
                .orderBy(
                  eb.fn
                    .agg<number>("row_number")
                    .over((ob: any) => ob.orderBy("order"))
                )
            ).as("images"),
          ])
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("OrderItem.name"))
          )
      ).as("items"),
    ])
    .where("Order.id", "=", orderId);

export const getOrderDetailQuery = (orderId: string) =>
  db
    .selectFrom("Order")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .selectAll("Order")
    .select((eb) => [
      "Shop.name as shopName",
      jsonArrayFrom(
        eb
          .selectFrom("OrderOrderItem")
          .innerJoin("OrderItem", (join) =>
            join
              .onRef("OrderOrderItem.itemId", "=", "OrderItem.id")
              .onRef("OrderOrderItem.version", "=", "OrderItem.version")
          )
          .leftJoin("OrderItemImage", (join) =>
            join
              .onRef("OrderItemImage.itemId", "=", "OrderItem.id")
              .onRef("OrderItemImage.version", "=", "OrderItem.version")
              .on("OrderItemImage.order", "=", 0)
          )
          .select(["id", "name", "price", "quantity", "imageName as image"])
          .whereRef("OrderOrderItem.orderId", "=", "Order.id")
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("name"))
          )
      ).as("items"),
    ])
    .where("Order.id", "=", orderId);

export const getOrderItemQuery = (orderId: string, itemId: string) =>
  db
    .selectFrom("OrderOrderItem")
    .innerJoin("OrderItem", (join) =>
      join
        .onRef("OrderOrderItem.itemId", "=", "OrderItem.id")
        .onRef("OrderOrderItem.version", "=", "OrderItem.version")
    )
    .innerJoin("Order", "OrderOrderItem.orderId", "Order.id")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .select((eb) => [
      "OrderItem.id",
      "OrderItem.name",
      "price",
      "OrderOrderItem.quantity",
      "OrderItem.description",
      "Order.shopId",
      "Shop.name as shopName",
      "OrderOrderItem.createdAt",
      jsonArrayFrom(
        eb
          .selectFrom("OrderItemImage")
          .select(["imageName", "order"])
          .whereRef("OrderItemImage.itemId", "=", "OrderItem.id")
          .whereRef("OrderItemImage.version", "=", "OrderItem.version")
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("order"))
          )
      ).as("images"),
    ])
    .where("OrderOrderItem.orderId", "=", orderId)
    .where("OrderOrderItem.itemId", "=", itemId);

export const getOrderItemQueryByVersion = (itemId: string, version: number) =>
  db
    .selectFrom("OrderItem")
    .selectAll()
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom("OrderItemImage")
          .select(["imageName", "order"])
          .whereRef("OrderItemImage.itemId", "=", "OrderItem.id")
          .whereRef("OrderItemImage.version", "=", "OrderItem.version")
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("order"))
          )
      ).as("images"),
    ])
    .where("OrderItem.id", "=", itemId)
    .where("OrderItem.version", "=", version);

export const getOrdersQuery = (options: z.infer<typeof getOrdersOption>) => {
  const { userId, shopId, status, itemName, newerThan, orderBy, page, limit } =
    options;
  const offset = limit * (page - 1);
  let query = db
    .selectFrom("Order")
    .innerJoin("Shop", "Shop.id", "Order.shopId")
    .selectAll("Order")
    .select(["Shop.name as shopName"])
    .orderBy(orderOrderOptions[orderBy ?? "newest"])
    .limit(limit)
    .offset(offset);

  if (userId) query = query.where("Order.userId", "=", userId);
  if (shopId) query = query.where("Order.shopId", "=", shopId);
  if (status) query = query.where("Order.status", "in", status);
  if (newerThan) query = query.where("Order.createdAt", ">=", newerThan);
  if (itemName)
    query = query.where(({ exists, selectFrom }) =>
      exists(
        selectFrom("OrderOrderItem")
          .innerJoin("OrderItem", (join) =>
            join
              .onRef("OrderOrderItem.itemId", "=", "OrderItem.id")
              .onRef("OrderOrderItem.version", "=", "OrderItem.version")
          )
          .select(["OrderItem.name", "OrderOrderItem.orderId"])
          .whereRef("OrderOrderItem.orderId", "=", "Order.id")
          .where("OrderItem.name", "like", `%${itemName}%`)
      )
    );

  return query;
};
