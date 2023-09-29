import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
  defaultUser,
} from "../../../test/helpers/user/userHelper";
import { faker } from "@faker-js/faker";
import request from "supertest";
import Cart from "../../../models/Cart";
import { invalidUuid } from "../../../test/helpers/commonData";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import {
  invalidCartQuantity,
  invalidCartUpdateQuantity,
} from "../../../test/helpers/cartHelper";
import _ from "lodash";
const url = "/api/cart";

describe("require authentication", () => {
  authenticationTests(app, url, "patch");
});

beforeEach(async () => {
  await createDefaultUser();
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

it("return 400 for invalid quantity", async () => {
  await Promise.all(
    invalidCartUpdateQuantity.map((quantity) =>
      request(app)
        .patch(url)
        .set("Cookie", defaultCookie())
        .send({ itemId: faker.string.uuid(), quantity })
        .expect(400)
    )
  );
});

it("return 404 if item doesn't exist in cart", async () => {
  const [item] = await createItem([{ quantity: 20 }]);

  //add item to another user's cart
  const {
    users: [anotherUser],
  } = await createUser(1);
  await anotherUser.$add("itemsInCart", item, { through: { quantity: 10 } });

  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: defaultItem.id, quantity: 10 })
    .expect(404);
});

it("return 422 if quantity to add exceeds item's current inventory", async () => {
  const [item] = await createItem([{ quantity: 5 }]);
  const cart = await Cart.create({ userId: defaultUser.id, itemId: item.id });

  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 6 })
    .expect(422);
});

it("will delete item from cart if quantity is set to 0", async () => {
  const [item] = await createItem([{ quantity: 20 }]);
  const cart = await Cart.create({ userId: defaultUser.id, itemId: item.id });

  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 0 })
    .expect(200);
  expect(
    await Cart.findOne({ where: { userId: defaultUser.id, itemId: item.id } })
  ).toBeNull();
});

it("successfully updates cart", async () => {
  const [item] = await createItem([{ quantity: 20 }]);
  const cart = await Cart.create({ userId: defaultUser.id, itemId: item.id });

  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 5, selected: false })
    .expect(200)
    .expect(({ body }) => {
      expect(
        _.pick(body, ["itemId", "userId", "quantity", "selected"])
      ).toEqual({
        itemId: item.id,
        userId: defaultUser.id,
        quantity: 5,
        selected: false,
      });
    });
  expect(
    (await Cart.findOne({ where: { userId: defaultUser.id, itemId: item.id } }))
      ?.quantity
  ).toEqual(5);
});
