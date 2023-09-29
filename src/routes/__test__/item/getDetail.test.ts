import { faker } from "@faker-js/faker";
import request from "supertest";
import app from "../../../app";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
import Item from "../../../models/Item";

const url = "/api/item/";

it("should return 404 when there are item does not exist", async () => {
  await request(app)
    .get(url + defaultItem.id)
    .expect(404);
});

it("should return 404 when there are 10 items but using default item ID", async () => {
  await createItem(10);
  await request(app)
    .get(url + defaultItem.id)
    .expect(404);
});

it("should return 200 when there is 1 item from 1 user using the created item ID", async () => {
  const [item] = await createItem([defaultItem], defaultShop);
  await request(app)
    .get(url + defaultItem.id)
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        ...defaultItem,
        createdAt: (item?.createdAt as Date).toISOString(),
        updatedAt: (item?.updatedAt as Date).toISOString(),
      });
    });
});

it("should return 200 when there are 10 items created and using one of the created item IDs", async () => {
  await createItem(
    new Array(5).fill({}).concat([defaultItem], new Array(4).fill({})),
    defaultShop
  );
  expect(await Item.count()).toEqual(10);
  const item = await Item.findByPk(defaultItem.id);
  await request(app)
    .get(url + defaultItem.id)
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        ...defaultItem,
        createdAt: (item?.createdAt as Date).toISOString(),
        updatedAt: (item?.updatedAt as Date).toISOString(),
      });
    });
});
