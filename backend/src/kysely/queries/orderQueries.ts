import { db } from "../database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/mysql";
import { getOrdersOption } from "@elycommerce/common";
import { z } from "zod";

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
          .innerJoin("TempOrderItem", (join) =>
            join
              .onRef("OrderOrderItem.orderId", "=", "Order.id")
              .onRef("OrderOrderItem.itemId", "=", "TempOrderItem.id")
              .onRef("OrderOrderItem.version", "=", "TempOrderItem.version")
          )
          .select((eb) => [
            "id",
            "name",
            "price",
            "quantity",
            jsonArrayFrom(
              eb
                .selectFrom("TempOrderItemImage")
                .select(["imageName", "order"])
                .whereRef("TempOrderItemImage.itemId", "=", "TempOrderItem.id")
                .whereRef(
                  "TempOrderItemImage.version",
                  "=",
                  "TempOrderItem.version"
                )
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
              .over((ob: any) => ob.orderBy("TempOrderItem.name"))
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
          .innerJoin("TempOrderItem", (join) =>
            join
              .onRef("OrderOrderItem.orderId", "=", "Order.id")
              .onRef("OrderOrderItem.itemId", "=", "TempOrderItem.id")
              .onRef("OrderOrderItem.version", "=", "TempOrderItem.version")
          )
          .leftJoin("TempOrderItemImage", (join) =>
            join
              .onRef("TempOrderItemImage.itemId", "=", "TempOrderItem.id")
              .onRef("TempOrderItemImage.version", "=", "TempOrderItem.version")
              .on("TempOrderItemImage.order", "=", 0)
          )
          .select((eb) => [
            "id",
            "name",
            "price",
            "quantity",
            "imageName as image",
          ])
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("TempOrderItem.name"))
          )
      ).as("items"),
    ])
    .where("Order.id", "=", orderId);

export const getOrderDetailWithOldItemQuery = (orderId: string) =>
  db
    .selectFrom("Order")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .selectAll("Order")
    .select((eb) => [
      "Shop.name as shopName",
      jsonArrayFrom(
        eb
          .selectFrom(({ eb }) =>
            eb
              .selectFrom("OrderOrderItem")
              .innerJoin("TempOrderItem", (join) =>
                join
                  .onRef("OrderOrderItem.itemId", "=", "TempOrderItem.id")
                  .onRef("OrderOrderItem.version", "=", "TempOrderItem.version")
              )
              .leftJoin("TempOrderItemImage", (join) =>
                join
                  .onRef("TempOrderItemImage.itemId", "=", "TempOrderItem.id")
                  .onRef(
                    "TempOrderItemImage.version",
                    "=",
                    "TempOrderItem.version"
                  )
                  .on("TempOrderItemImage.order", "=", 0)
              )
              .select(["id", "name", "price", "quantity", "imageName as image"])
              .whereRef("OrderOrderItem.orderId", "=", "Order.id")
              .unionAll((ebUnused) =>
                eb
                  .selectFrom("OrderItem")
                  .leftJoin("OrderItemImage", (join) =>
                    join
                      .onRef("OrderItem.orderId", "=", "OrderItemImage.orderId")
                      .onRef("OrderItem.id", "=", "OrderItemImage.itemId")
                      .on("OrderItemImage.order", "=", 0)
                  )
                  .select([
                    "id",
                    "name",
                    "price",
                    "quantity",
                    "imageName as image",
                  ])
                  .whereRef("OrderItem.orderId", "=", "Order.id")
              )
              .as("comb")
          )
          .select(["id", "name", "price", "quantity", "image"])
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("name"))
          )
      ).as("items"),
    ])
    .where("Order.id", "=", orderId);

export const getOrderItemWithOldItemQuery = (orderId: string, itemId: string) =>
  db
    .selectFrom("OrderOrderItem")
    .innerJoin("TempOrderItem", (join) =>
      join
        .onRef("OrderOrderItem.itemId", "=", "TempOrderItem.id")
        .onRef("OrderOrderItem.version", "=", "TempOrderItem.version")
    )
    .innerJoin("Order", "OrderOrderItem.orderId", "Order.id")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .select((eb) => [
      "TempOrderItem.id",
      "TempOrderItem.name",
      "price",
      "OrderOrderItem.quantity",
      "TempOrderItem.description",
      "Order.shopId",
      "Shop.name as shopName",
      "OrderOrderItem.createdAt",
      jsonArrayFrom(
        eb
          .selectFrom("TempOrderItemImage")
          .select(["imageName", "order"])
          .whereRef("TempOrderItemImage.itemId", "=", "TempOrderItem.id")
          .whereRef("TempOrderItemImage.version", "=", "TempOrderItem.version")
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("order"))
          )
      ).as("images"),
    ])
    .where("OrderOrderItem.orderId", "=", orderId)
    .where("OrderOrderItem.itemId", "=", itemId)
    .unionAll((eb) =>
      eb
        .selectFrom("OrderItem")
        .innerJoin("Order", "OrderItem.orderId", "Order.id")
        .innerJoin("Shop", "Order.shopId", "Shop.id")
        .select((eb) => [
          "OrderItem.id",
          "OrderItem.name",
          "price",
          "quantity",
          "OrderItem.description",
          "Order.shopId",
          "Shop.name as shopName",
          "OrderItem.createdAt",
          jsonArrayFrom(
            eb
              .selectFrom("OrderItemImage")
              .select(["imageName", "order"])
              .whereRef("OrderItemImage.orderId", "=", "OrderItem.orderId")
              .whereRef("OrderItemImage.itemId", "=", "OrderItem.id")
              .orderBy(
                eb.fn
                  .agg<number>("row_number")
                  .over((ob: any) => ob.orderBy("order"))
              )
          ).as("images"),
        ])
        .where("OrderItem.orderId", "=", orderId)
        .where("OrderItem.id", "=", itemId)
    );

export const getOrderItemQueryByVersion = (itemId: string, version: number) =>
  db
    .selectFrom("TempOrderItem")
    .selectAll()
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom("TempOrderItemImage")
          .select(["imageName", "order"])
          .whereRef("TempOrderItemImage.itemId", "=", "TempOrderItem.id")
          .whereRef("TempOrderItemImage.version", "=", "TempOrderItem.version")
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("order"))
          )
      ).as("images"),
    ])
    .where("TempOrderItem.id", "=", itemId)
    .where("TempOrderItem.version", "=", version);

enum orderOrderOptions {
  oldest = "Order.createdAt asc",
  newest = "Order.createdAt desc",
}

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
        selectFrom((eb) =>
          eb
            .selectFrom("OrderOrderItem")
            .innerJoin("TempOrderItem", (join) =>
              join
                .onRef("OrderOrderItem.itemId", "=", "TempOrderItem.id")
                .onRef("OrderOrderItem.version", "=", "TempOrderItem.version")
            )
            .select(["TempOrderItem.name", "OrderOrderItem.orderId"])
            .unionAll(
              eb
                .selectFrom("OrderItem")
                .select(["OrderItem.name", "OrderItem.orderId"])
            )
            .as("searchSub")
        )
          .selectAll()
          .whereRef("searchSub.orderId", "=", "Order.id")
          .where("searchSub.name", "like", `%${itemName}%`)
      )
    );

  return query;
};
