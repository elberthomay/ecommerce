import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import { defaultShop } from "../../../test/helpers/shop/shopHelper";
import { createItem } from "../../../test/helpers/item/itemHelper";
import request from "supertest";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import {
  ItemGetOutputType,
  ShopItemGetOutputType,
} from "../../../types/itemTypes";
import { faker } from "@faker-js/faker";

const url = "/api/shop/" + defaultShop.id + "/item";

type ShopItemReqBodyType = {
  body: { count: number; rows: ShopItemGetOutputType[] };
};

const isInStock = (item: ShopItemGetOutputType) => item.quantity !== 0;
const isPriceSorted = (
  items: ShopItemGetOutputType[],
  comparator: (cur: number, prev: number) => boolean
) =>
  items.every(({ price }, index, array) => {
    return comparator(price, array[index !== 0 ? index - 1 : index].price);
  });

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

  await request(app)
    .get(url)
    .send()
    .expect(200)
    .expect(({ body: { count, rows } }: ShopItemReqBodyType) => {
      expect(count).toEqual(150);
      //first 50 must be in stock
      expect(rows.slice(0, 50).every(isInStock)).toBe(true);

      //return 80 item, default limit
      expect(rows).toHaveLength(80);
    });
});

it("sort by price ascending when corresponding query option is used", async () => {
  await createItem(Array(50).fill({ quantity: 0, price: 0 }), defaultShop);

  await createItem(50, defaultShop);

  await request(app)
    .get(url)
    .query({ orderBy: "cheapest" })
    .expect(200)
    .expect(({ body: { count, rows } }: ShopItemReqBodyType) => {
      expect(rows).toHaveLength(80);

      expect(isPriceSorted(rows.slice(0, 50), (cur, prev) => cur >= prev)).toBe(
        true
      );

      //first 50 in stock
      expect(rows.slice(0, 50).every(isInStock)).toBe(true);
      //the rest not in stock
      expect(rows.slice(50, 80).every(isInStock)).toBe(false);
    });
});

it("sort by price descending when corresponding query option is used", async () => {
  await createItem(
    Array(50).fill({ quantity: 0, price: 1000000000 }),
    defaultShop
  );
  await createItem(100, defaultShop);

  await request(app)
    .get(url)
    .query({ orderBy: "mostExpensive" })
    .expect(200)
    .expect(({ body: { count, rows } }) => {
      expect(rows).toHaveLength(80);
      //price descending
      expect(isPriceSorted(rows, (cur, prev) => cur <= prev)).toBe(true);

      expect(rows.every(isInStock)).toBe(true);
    });
});

it("search by string when search query is provided", async () => {
  const createItemNameWithInsert = (name: string) => {
    const productNameWords = faker.commerce.productName().split(" ");
    const randomPosition = Math.floor(
      Math.random() * productNameWords.length + 1
    );
    //splice a mutating function
    productNameWords.splice(randomPosition, 0, name);
    return productNameWords.join(" ");
  };

  const keyWord = "dragon";
  //create 30 items with keyword randomly inserted
  await createItem(
    Array.from({ length: 30 }, () => ({
      name: createItemNameWithInsert(keyWord),
    })),
    defaultShop
  );
  await createItem(20, defaultShop);

  //create 30 items with keyword randomly inserted on another shop
  await createItem(
    Array.from({ length: 30 }, () => ({
      name: createItemNameWithInsert(keyWord),
    }))
  );

  await request(app)
    .get(url)
    .query({ search: keyWord })
    .expect(200)
    .expect(({ body: { count, rows } }: ShopItemReqBodyType) => {
      expect(rows).toHaveLength(30);
      //result have the specified keyword in it"
      expect(rows.every(({ name }) => name.includes(keyWord))).toBe(true);

      expect(rows.every(isInStock)).toBe(true);
    });
});
