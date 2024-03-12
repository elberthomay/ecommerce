import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import Item from "../../../models/Item";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { createShop, defaultShop } from "../../../test/helpers/shop/shopHelper";
import { invalidUuid } from "../../../test/helpers/commonData";
import _ from "lodash";
import { defaultRootUser } from "../../../test/helpers/user/userData";
import { z } from "zod";
import { itemUpdateSchema } from "@elycommerce/common";

const url = "/api/item/";

const changesItemData: z.infer<typeof itemUpdateSchema> = {
  name: "Green Tree",
  description: "Green Tree with good shades",
  price: 5000,
  quantity: 3,
};

beforeEach(async () => {
  await createItem([defaultItem], defaultShop);
});

describe("should return 401 when unauthenticated", () => {
  authenticationTests(app, url + defaultItem.id, "patch", changesItemData);
});

it("should return 400 validation error when accessed with invalid itemId", async () => {
  await Promise.all(
    invalidUuid.map((invalidId) =>
      request(app)
        .patch(url + invalidId)
        .set("Cookie", defaultCookie())
        .send(changesItemData)
        .expect(400)
    )
  );
});

it("should return 400 validation error when accessed with invalid update property", async () => {
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send({ ...changesItemData, invalidProperty: "hehehe" })
    .expect(400);
});
it("should return 400 validation error when accessed with no update property", async () => {
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send({})
    .expect(400);
});

it("should return 200 when deleted by admin or root", async () => {
  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);
  const [newItem] = await createItem(1); //create item for another user
  const count = await Item.count();

  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", forgeCookie(newAdmin))
    .send(changesItemData)
    .expect(200);

  await request(app)
    .patch(url + newItem.id)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send(changesItemData)
    .expect(200);
});

it("should return 403 unauthorized when item is not associated with user's shop", async () => {
  //create another user
  const [shop] = await createShop(1);
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", forgeCookie({ id: shop.userId }))
    .send(changesItemData)
    .expect(403);
});

it("should return 200 success when item is associated with user's shop with correct update data", async () => {
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send(changesItemData)
    .expect(200)
    .expect(async ({ body }) => {
      const updatedItem = _.pick(body, [
        "id",
        "name",
        "description",
        "price",
        "quantity",
        "shopId",
      ]);

      expect(updatedItem).toEqual({ ...defaultItem, ...changesItemData });
    });

  const item = await Item.findByPk(defaultItem.id);
  const databaseItem = _.pick(item, [
    "id",
    "name",
    "description",
    "price",
    "quantity",
    "shopId",
  ]);
  expect(databaseItem).toEqual({ ...defaultItem, ...changesItemData });
});
