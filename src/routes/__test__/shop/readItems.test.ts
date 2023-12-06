import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import { defaultShop } from "../../../test/helpers/shop/shopHelper";
import { createItem } from "../../../test/helpers/item/itemHelper";
import request from "supertest";
import Item, { ItemCreationAttribute } from "../../../models/Item";

const url = "/api/shop/" + defaultShop.id + "/item";

describe("Test limit and paging", () => {
  pagingAndLimitTests(
    app,
    url,
    (count: number) => createItem(count, defaultShop),
    (body: any) => body.rows
  );
});

describe("Test limit and paging with items from other shop", () => {
  beforeEach(async () => {
    await createItem(100);
  });
  pagingAndLimitTests(
    app,
    url,
    (count: number) => createItem(count, defaultShop),
    (body: any) => body.rows
  );
});

it("order first by whenever item sold out or not", async () => {
  //create 150 item in default shop 100 of which are empty
  const item = await createItem(
    Array(50)
      .fill({ quantity: 0 })
      .concat(Array(50).fill({ quantity: 5 }), Array(50).fill({ quantity: 0 })),
    defaultShop
  );

  const items = await Item.findAll({});

  await request(app)
    .get(url)
    .send()
    .expect(200)
    .expect(({ body: { count, rows } }) => {
      expect(count).toEqual(150);
      //first 50 must be in stock
      const firstFifty = (rows as ItemCreationAttribute[]).slice(0, 50);
      expect(firstFifty.every((item) => item.quantity !== 0)).toBe(true);

      //return 80 item, default limit
      expect(rows).toHaveLength(80);
    });
});

it("sort by price ascending when corresponding query option is used", async () => {
  await createItem(Array(50).fill({ quantity: 0, price: 0 }), defaultShop);
  const items = await createItem(100, defaultShop);

  await request(app)
    .get(url)
    .query({ orderBy: "cheapest" })
    .expect(200)
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
  await createItem(
    Array(50).fill({ quantity: 0, price: 1000000000 }),
    defaultShop
  );
  const items = await createItem(100, defaultShop);

  await request(app)
    .get(url)
    .query({ orderBy: "mostExpensive" })
    .expect(200)
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
