import request from "supertest";
import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import Tag from "../../../models/Tag";
import { createItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
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
