import { InsertResult, Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE \`OrderOrderItem\` DROP PRIMARY KEY, ADD PRIMARY KEY(\`orderId\`, \`itemId\`)`.execute(
    db
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE \`OrderOrderItem\` DROP PRIMARY KEY, ADD PRIMARY KEY(\`orderId\`, \`itemId\`, \`version\`)`.execute(
    db
  );
}
