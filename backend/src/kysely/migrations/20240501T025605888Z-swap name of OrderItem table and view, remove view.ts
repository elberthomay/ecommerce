import { InsertResult, Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`RENAME TABLE 
                \`OrderItem\` TO \`OrderItemView\`, 
                \`OrderItemImage\` TO \`OrderItemImageView\`,
                \`TempOrderItem\` TO \`OrderItem\`,
                \`TempOrderItemImage\` TO \`OrderItemImage\``.execute(db);
  await db.schema.dropView("OrderItemView").ifExists().execute();
  await db.schema.dropView("OrderItemImageView").ifExists().execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Migration code
}
