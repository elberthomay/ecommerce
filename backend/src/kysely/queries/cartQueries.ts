import { Kysely } from "kysely";
import { DB } from "../schema";
import { db } from "../database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/mysql";

export const selectedCartItemDetailQuery = (
  userId: string,
  dbInst: Kysely<DB> = db
) =>
  dbInst
    .selectFrom("Cart")
    .selectAll()
    .select((eb) => [
      jsonObjectFrom(
        eb
          .selectFrom("Item")
          .select((eb) => [
            "Item.id",
            "Item.name",
            "Item.quantity",
            "Item.price",
            "Item.version",
            "Item.shopId",
            jsonArrayFrom(
              eb
                .selectFrom("ItemImages")
                .select(["ItemImages.imageName", "ItemImages.order"])
                .whereRef("ItemImages.itemId", "=", "Item.id")
                .orderBy(
                  eb.fn
                    .agg<number>("row_number")
                    .over((ob: any) => ob.orderBy("ItemImages.order"))
                )
            ).as("images"),
          ])
          .whereRef("Item.id", "=", "Cart.itemId")
      ).as("item"),
    ])
    .where("Cart.userId", "=", userId)
    .where("Cart.selected", "=", 1);
