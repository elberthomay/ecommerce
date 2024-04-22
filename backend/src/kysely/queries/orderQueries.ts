import { sql } from "kysely";
import { db } from "../database";
import { jsonArrayFrom } from "kysely/helpers/mysql";
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
          .unionAll((eb) =>
            eb.selectFrom("OrderItem").select((eb) => [
              "id",
              "name",
              "price",
              "quantity",
              jsonArrayFrom(
                eb
                  .selectFrom("OrderItemImage")
                  .select(["imageName", "order"])
                  .whereRef("OrderItemImage.itemId", "=", "OrderItem.id")
                  .whereRef("OrderItemImage.orderId", "=", "OrderItem.orderId")
                  .orderBy(
                    eb.fn
                      .agg<number>("row_number")
                      .over((ob: any) => ob.orderBy("TempOrderItemImage.order"))
                  )
              ).as("images"),
            ])
          )
          .orderBy(
            eb.fn
              .agg<number>("row_number")
              .over((ob: any) => ob.orderBy("name"))
          )
      ).as("items"),
    ])
    .where("Order.id", "=", orderId);
