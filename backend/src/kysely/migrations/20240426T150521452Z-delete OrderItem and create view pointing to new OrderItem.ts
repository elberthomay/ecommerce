import { InsertResult, Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("OrderItemImage").ifExists().execute();
  await db.schema.dropTable("OrderItem").ifExists().execute();
  await db.schema
    .createView("OrderItemImage")
    .as(db.selectFrom("TempOrderItemImage").selectAll())
    .execute();
  await db.schema
    .createView("OrderItem")
    .as(db.selectFrom("TempOrderItem").selectAll())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Migration code
}
