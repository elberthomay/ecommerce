import request from "supertest";
import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import Tag from "../../../models/Tag";
import { createItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shop/shopHelper";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import { itemGetOutputSchema } from "../../../schemas/itemSchema";
import { faker } from "@faker-js/faker";
import ItemImage from "../../../models/ItemImage";
import { z } from "zod";
import { printedExpect } from "../../../test/helpers/assertionHelper";
const url = "/api/item";

describe("test basic paging and limit", () => {
  pagingAndLimitTests(
    app,
    url,
    (count: number) => createItem(count, defaultShop),
    (body: any) => body.rows
  );
});

it("reject search string with invalid character", async () => {
  //create 120 items across 3 shops
  const shopId = faker.string.uuid();
  await createItem(40, { id: shopId });

  await request(app)
    .get(url)
    .query({ search: "/'\"" })
    .send()
    .expect(printedExpect(400));
});

it("should return item from all shop", async () => {
  //create 120 items across 3 shops
  await createItem(40);
  await createItem(40);
  await createItem(40);

  await request(app)
    .get(url)
    .query({ limit: 120 })
    .send()
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      expect(count).toEqual(120);
      expect(rows).toHaveLength(120);
    });
  await request(app)
    .get(url)
    .query({ limit: 80 })
    .send()
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      expect(rows).toHaveLength(80);
    });
});

it("should return items with the correct tag when using tagId query option", async () => {
  //create list of items
  const items = await createItem(300);
  //create tags
  const tags = await Tag.bulkCreate(
    ["food", "clothing", "jars"].map((name) => ({ name }))
  );
  //add 100 items each to each tag
  await Promise.all(
    tags.map((tag, index) => {
      return tag.$add("items", items.slice(index * 100, index * 100 + 100));
    })
  );

  await request(app)
    .get(url)
    .query({
      tagIds: tags
        .slice(0, 2)
        .map((tag) => tag.id)
        .join(","),
      limit: 300,
    })
    .send()
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      expect(rows).toHaveLength(200);
    });
});

it("order first by whenever item sold out or not", async () => {
  //create 150 item in default shop 100 of which are empty
  const item = await createItem(
    Array(50)
      .fill({ quantity: 0 })
      .concat(Array(50).fill({ quantity: 5 }), Array(50).fill({ quantity: 0 }))
  );

  const items = await Item.findAll();

  await request(app)
    .get(url)
    .send()
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      //return 80 item, default limit
      expect(count).toEqual(150);
      expect(rows).toHaveLength(80);

      //first 50 must be in stock
      const firstFifty = (rows as ItemCreationAttribute[]).slice(0, 50);
      expect(firstFifty.every((item) => item.quantity !== 0)).toBe(true);

      //next 30 must be out of stock
      const lastThirty = (rows as ItemCreationAttribute[]).slice(50, 80);
      expect(lastThirty.every((item) => item.quantity === 0)).toBe(true);
    });
});

it("sort by price ascending when corresponding query option is used", async () => {
  await createItem(Array(50).fill({ quantity: 0, price: 0 }));
  const items = await createItem(100);

  await request(app)
    .get(url)
    .query({ orderBy: "cheapest" })
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      expect(rows).toHaveLength(80);
      const priceIsAscending = (rows as ItemCreationAttribute[]).every(
        ({ price }, index, array) => {
          //every price must be higher or equal than the last, first one compare with itself
          return price >= array[index ? index - 1 : index].price;
        }
      );
      expect(priceIsAscending).toBe(true);
      const allInStock = (rows as ItemCreationAttribute[]).every(
        ({ quantity }) => quantity != 0
      );
      expect(allInStock).toBe(true);
    });
});

it("sort by price descending when corresponding query option is used", async () => {
  await createItem(Array(50).fill({ quantity: 0, price: 1000000000 }));
  const items = await createItem(100);

  await request(app)
    .get(url)
    .query({ orderBy: "mostExpensive" })
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      expect(rows).toHaveLength(80);
      const priceIsDescending = (rows as ItemCreationAttribute[]).every(
        ({ price }, index, array) => {
          //every price must be lower or equal than the last, first one compare with itself
          return price <= array[index ? index - 1 : index].price;
        }
      );
      expect(priceIsDescending).toBe(true);
      const allInStock = (rows as ItemCreationAttribute[]).every(
        ({ quantity }) => quantity != 0
      );
      expect(allInStock).toBe(true);
    });
});

it("return item and shop data with determined format", async () => {
  const items = await createItem(20);
  await Promise.all(
    items.slice(0, 10).map(({ id: itemId }) =>
      ItemImage.bulkCreate([
        { itemId, imageName: "http://image.com/2", order: 1 },
        { itemId, imageName: "http://image.com/3", order: 2 },
        { itemId, imageName: "http://image.com/1", order: 0 },
        { itemId, imageName: "http://image.com/4", order: 3 },
      ])
    )
  );
  await request(app)
    .get(url)
    .send()
    .expect(printedExpect(200))
    .expect(async ({ body }: { body: z.infer<typeof itemGetOutputSchema> }) => {
      const validationResult = itemGetOutputSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.count).toBe(20);
        // image is image with order 0
        expect(
          validationResult.data.rows
            .filter(({ image }) => image)
            .every(({ image }) => image === "http://image.com/1")
        ).toBeTruthy();
      }
    });
});

it("should return item with certain string when search option is used", async () => {
  //create 120 items across 3 shops
  const shopId = faker.string.uuid();
  await createItem(40, { id: shopId });
  await createItem(
    [
      { name: "blue eyes white dragon" },
      { name: "red eyes blade dragon" },
      { name: "green eyes scaley dragon" },
    ],
    { id: shopId }
  );

  await request(app)
    .get(url)
    .query({ search: "dragon" })
    .send()
    .expect(printedExpect(200))
    .expect(({ body: { count, rows } }) => {
      expect(count).toEqual(3);
    });
});
