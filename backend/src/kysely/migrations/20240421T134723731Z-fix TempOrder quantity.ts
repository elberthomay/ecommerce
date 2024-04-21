import { InsertResult, Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("OrderOrderItem")
    .addColumn("quantity", "integer")
    .execute();

  let currentData: InsertResult | undefined = undefined;
  //moves existing data
  do {
    currentData = await db
      .insertInto("OrderOrderItem")
      .columns([
        "orderId",
        "itemId",
        "version",
        "quantity",
        "createdAt",
        "updatedAt",
      ])
      .expression((eb) =>
        eb
          .selectFrom("OrderOrderItem")
          .innerJoin("TempOrderItem", (join) =>
            join
              .onRef("OrderOrderItem.itemId", "=", "TempOrderItem.id")
              .onRef("OrderOrderItem.version", "=", "TempOrderItem.version")
          )
          .select([
            "OrderOrderItem.orderId",
            "OrderOrderItem.itemId",
            "OrderOrderItem.version",
            "TempOrderItem.quantity",
            eb.fn("NOW").as("createdAt"),
            eb.fn("NOW").as("updatedAt"),
          ])
          .where("OrderOrderItem.quantity", "is", null)
          .limit(50)
      )
      .onDuplicateKeyUpdate((eb) => ({
        quantity: eb.fn("VALUES", ["quantity"]),
      }))
      .executeTakeFirst();
  } while (!currentData);

  await db.schema
    .alterTable("OrderOrderItem")
    .modifyColumn("quantity", "integer", (col) => col.notNull().defaultTo(1))
    .execute();

  await db.schema.alterTable("TempOrderItem").dropColumn("quantity").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Migration code
}
