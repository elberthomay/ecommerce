import request from "supertest";
import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import Tag from "../../../models/Tag";
import { createItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
import Item, { ItemCreationAttribute } from "../../../models/Item";
const url = "/api/item";

describe("test basic paging and limit", () => {
  pagingAndLimitTests(app, url, (count: number) =>
    createItem(count, defaultShop)
  );
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
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(120);
    });
  await request(app)
    .get(url)
    .query({ limit: 80 })
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(80);
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
    .query({ tagId: tags[0].id, limit: 200 })
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(100);
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
  console.log(items.length);

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
