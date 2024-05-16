import { InsertResult, Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("Review")
    .ifNotExists()
    .addColumn("id", "bigint", (col) =>
      col.primaryKey().autoIncrement().unsigned()
    )
    .addColumn(
      "orderId",
      sql`CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
      (col) => col.notNull()
    )
    .addColumn(
      "itemId",
      sql`CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
      (col) => col.notNull()
    )
    .addColumn("rating", sql`TINYINT`, (col) => col.notNull().unsigned())
    .addColumn("review", "varchar(255)")
    .addColumn("anonymous", "boolean", (col) => col.notNull())
    .addColumn("createdAt", "datetime", (col) => col.notNull())
    .addColumn("updatedAt", "datetime", (col) => col.notNull())
    .addForeignKeyConstraint(
      "OrderOrderItem_Review_fk",
      ["orderId", "itemId"],
      "OrderOrderItem",
      ["orderId", "itemId"],
      (fk) => fk.onDelete("cascade").onUpdate("cascade")
    )
    .execute();

  await db.schema
    .createTable("ReviewImage")
    .ifNotExists()
    .addColumn("reviewId", "bigint", (col) => col.unsigned())
    .addColumn("order", "smallint", (col) => col.notNull())
    .addColumn("imageName", "varchar(255)", (col) => col.notNull())
    .addPrimaryKeyConstraint("ReviewImage_pk", ["reviewId", "order"])
    .addForeignKeyConstraint(
      "ReviewImageReview_fk",
      ["reviewId"],
      "Review",
      ["id"],
      (fk) => fk.onDelete("cascade").onUpdate("cascade")
    )
    .execute();
  await db.schema
    .createTable("ItemRatingAggregate")
    .ifNotExists()
    .addColumn(
      "itemId",
      sql`CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
      (col) => col.primaryKey()
    )
    .addColumn("reviewCount", "integer", (col) => col.notNull())
    .addColumn("reviewAverage", "double precision", (col) => col.notNull())
    .addForeignKeyConstraint(
      "ItemRatingAggregate_Item_fk",
      ["itemId"],
      "Item",
      ["id"],
      (fk) => fk.onDelete("cascade").onUpdate("cascade")
    )
    .execute();

  await db.schema
    .createTable("ReviewLikes")
    .ifNotExists()
    .addColumn("reviewId", "bigint", (col) => col.unsigned())
    .addColumn(
      "userId",
      sql`char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
      (col) =>
        col.references("User.itemId").onDelete("cascade").onUpdate("cascade")
    )
    .addColumn("likes", sql`TINYINT`, (col) => col.notNull())
    .addPrimaryKeyConstraint("ReviewLikes_pk", ["reviewId", "userId"])
    .addForeignKeyConstraint(
      "ReviewLikes_Review_fk",
      ["reviewId"],
      "Review",
      ["id"],
      (fk) => fk.onDelete("cascade").onUpdate("cascade")
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("ReviewImage").execute();
  await db.schema.dropTable("ReviewAggregate").execute();
  await db.schema.dropTable("ReviewLikes").execute();
  await db.schema.dropTable("Review").execute();
}
