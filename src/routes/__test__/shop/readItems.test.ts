import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import { defaultShop } from "../../../test/helpers/shopHelper";
import { createItem } from "../../../test/helpers/item/itemHelper";
import request from "supertest";
import Item, { ItemCreationAttribute } from "../../../models/Item";

const url = "/api/shop/" + defaultShop.id + "/item";

describe("Test limit and paging", () => {
  pagingAndLimitTests(app, url, (count: number) =>
    createItem(count, defaultShop)
  );
});

describe("Test limit and paging with items from other shop", () => {
  beforeEach(async () => {
    await createItem(100);
  });
  pagingAndLimitTests(app, url, (count: number) =>
    createItem(count, defaultShop)
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
    .expect(({ body }) => {
      //first 50 must be in stock
      const firstFifty = (body as ItemCreationAttribute[]).slice(0, 50);
      expect(firstFifty.every((item) => item.quantity !== 0)).toBe(true);

      //return 80 item, default limit
      expect(body).toHaveLength(80);
    });
});
