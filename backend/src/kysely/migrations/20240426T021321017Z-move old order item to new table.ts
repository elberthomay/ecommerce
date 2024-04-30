import { InsertResult, Kysely } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/mysql";
import { DB } from "../schema";
import crypto from "crypto";

export async function up(db: Kysely<any>): Promise<void> {
  let itemIds: string[];
  do {
    itemIds = (
      await db
        .selectFrom("OrderItem")
        .distinct()
        .select(["OrderItem.id"])
        .limit(10)
        .execute()
    ).map(({ id }) => id);

    if (itemIds.length !== 0) {
      const orderItems = await db
        .selectFrom("OrderItem")
        .selectAll()
        .select((eb) => [
          jsonArrayFrom(
            eb
              .selectFrom("OrderItemImage")
              .select(["imageName", "order"])
              .whereRef("OrderItemImage.orderId", "=", "OrderItem.orderId")
              .whereRef("OrderItemImage.itemId", "=", "OrderItem.id")
              .orderBy((eb) =>
                eb.fn
                  .agg<number>("row_number")
                  .over((ob) => ob.orderBy("OrderItemImage.order"))
              ) //ensure stable order
          ).as("images"),
        ])
        .where("OrderItem.id", "in", itemIds)
        .orderBy("OrderItem.createdAt desc")
        .execute();

      const itemByIdCount = new Map<string, number>();

      const orderItemsGroupedByHash = orderItems.reduce(
        (itemsByHash, orderItem) => {
          const { createdAt, updatedAt, orderId, quantity, ...itemData } =
            orderItem;
          // identify unique item entries
          const hash = crypto
            .createHash("sha256")
            .update(JSON.stringify(itemData))
            .digest("hex");

          //item version already exist
          const existingItemVersion = itemsByHash.get(hash);
          if (existingItemVersion) {
            const version = existingItemVersion.itemData.version;
            //mutating
            existingItemVersion.orderData.push({
              orderId,
              itemId: itemData.id,
              version,
              quantity,
              createdAt,
              updatedAt,
            });
          } // new item or new version of existing item
          else {
            const currentItemCount = itemByIdCount.get(itemData.id) ?? 0; //check how many version of the item processed
            itemByIdCount.set(itemData.id, currentItemCount + 1);
            const version = -currentItemCount - 1;
            itemsByHash.set(hash, {
              orderData: [
                {
                  orderId,
                  itemId: itemData.id,
                  version,
                  quantity,
                  createdAt,
                  updatedAt,
                },
              ],
              //@ts-ignore
              itemData: {
                ...itemData,
                version,
                createdAt,
                updatedAt,
                images: itemData.images.map((img) => ({
                  ...img,
                  createdAt,
                  updatedAt,
                  itemId: itemData.id,
                  version,
                })),
              },
            });
          }
          return itemsByHash;
        },
        new Map<string, OrderItemByHash>()
      );
      const arrayOrderItem = Array.from(orderItemsGroupedByHash);

      const { newOrderItem, newImages, newOrderOrderItems } =
        arrayOrderItem.reduce(
          ({ newOrderItem, newImages, newOrderOrderItems }, [_, entry]) => {
            const { images, ...itemData } = entry.itemData;
            return {
              newOrderItem: [...newOrderItem, itemData],
              newImages: newImages.concat(images),
              newOrderOrderItems: newOrderOrderItems.concat(entry.orderData),
            };
          },
          {
            newOrderItem: [],
            newImages: [],
            newOrderOrderItems: [],
          } as OrderItemByDestinationTable
        );

      await db.transaction().execute(async (tx) => {
        await tx.insertInto("TempOrderItem").values(newOrderItem).execute();
        await tx.insertInto("TempOrderItemImage").values(newImages).execute();
        await tx
          .insertInto("OrderOrderItem")
          .values(newOrderOrderItems)
          .execute();
        await tx
          .deleteFrom("OrderItem")
          .where("OrderItem.id", "in", itemIds!)
          .execute();
      });
    }
  } while (itemIds.length !== 0);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Migration code
}

type OrderItemByHash = {
  orderData: {
    orderId: string;
    itemId: string;
    quantity: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  itemData: {
    id: string;
    version: number;
    description: string;
    name: string;
    price: number;
    createdAt: Date;
    updatedAt: Date;
    images: {
      itemId: string;
      version: number;
      imageName: string;
      order: number;
      createdAt: Date;
      updatedAt: Date;
    }[];
  };
};

type OrderItemByDestinationTable = {
  newOrderItem: {
    id: string;
    version: number;
    description: string;
    name: string;
    price: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  newImages: {
    itemId: string;
    version: number;
    imageName: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  newOrderOrderItems: {
    orderId: string;
    itemId: string;
    quantity: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
};
