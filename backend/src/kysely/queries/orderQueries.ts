import { sql } from "kysely";
import { db } from "../database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/mysql";
export const getOrdersQuery = (orderIds: string[]) =>
  db
    .selectFrom("Order")
    .innerJoin("Shop", "Order.shopId", "Shop.id")
    .selectAll("Order")
    .select("Shop.name as shopName")
    .where("Order.id", "in", orderIds)
    .orderBy("Order.shopId");

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
          .select((eb) => [
            "id",
            "name",
            "price",
            "version",
            "OrderOrderItem.quantity",
            jsonArrayFrom(
              eb
                .selectFrom("TempOrderItemImage")
                .select(["imageName", "order"])
                .whereRef(
                  "TempOrderItemImage.itemId",
                  "=",
                  "OrderOrderItem.itemId"
                )
                .whereRef(
                  "TempOrderItemImage.version",
                  "=",
                  "OrderOrderItem.version"
                )
                .orderBy(
                  eb.fn
                    .agg<number>("row_number")
                    .over((ob: any) => ob.orderBy("TempOrderItemImage.order"))
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
