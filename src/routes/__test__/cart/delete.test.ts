import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import { faker } from "@faker-js/faker";
import request from "supertest";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { defaultUser } from "../../../test/helpers/user/userData";
import User from "../../../models/User";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";
import Cart from "../../../models/Cart";
import { invalidUuid } from "../../../test/helpers/commonData";
import { createItem } from "../../../test/helpers/item/itemHelper";
const url = "/api/cart";

describe("require authentication", () => {
  authenticationTests(app, url, "delete");
});

it("return 400 for invalid itemId(body)", async () => {
  await Promise.all(
    invalidUuid.map((itemId) =>
      request(app)
        .delete(url)
        .set("Cookie", defaultCookie())
        .send({ itemId })
        .expect(400)
    )
  );
});

it("return 400 for invalid property", async () => {
  await request(app)
    .delete(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: faker.string.uuid(), property: "sneaky" })
    .expect(400);
});

it("return 404 if item doesn't exist", async () => {
  await request(app)
    .delete(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: faker.string.uuid() })
    .expect(404);
});

it("successfully deleted item from cart", async () => {
  const [item] = await createItem(5);
  await createDefaultUser();
  const cart = await Cart.create({ userId: defaultUser.id, itemId: item.id });

  await request(app)
    .delete(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id })
    .expect(200);

  expect(
    await Cart.findOne({ where: { userId: defaultUser.id, itemId: item.id } })
  ).toBeNull();
});

it("doesn't delete the same item from another user", async () => {
  const [item] = await createItem(5);
  const {
    users: [user, anotherUser],
  } = await createUser([defaultUser, {}]);

  const cartDefault = await Cart.create({
    userId: defaultUser.id,
    itemId: item.id,
  });

  const cartAnother = await Cart.create({
    userId: anotherUser.id,
    itemId: item.id,
  });

  await request(app)
    .delete(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id })
    .expect(200);

  expect(
    await Cart.findOne({ where: { userId: defaultUser.id, itemId: item.id } })
  ).toBeNull();

  expect(
    await Cart.findOne({ where: { userId: anotherUser.id, itemId: item.id } })
  ).not.toBeNull();
});

it("doesn't delete other cart item", async () => {
  const items = await createItem(5);
  await createDefaultUser();
  const cartDefault = await Cart.bulkCreate(
    items.map((item) => ({ userId: defaultUser.id, itemId: item.id }))
  );

  expect(
    await Cart.findAll({ where: { userId: defaultUser.id } })
  ).toHaveLength(5);

  await request(app)
    .delete(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: items[0].id })
    .expect(200);

  expect(
    await Cart.findAll({ where: { userId: defaultUser.id } })
  ).toHaveLength(4);
});
