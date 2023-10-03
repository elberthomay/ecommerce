import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import request from "supertest";
import { faker } from "@faker-js/faker";
import User from "../../../models/User";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { defaultUser } from "../../../test/helpers/user/userData";
import Cart from "../../../models/Cart";
import { invalidUuid } from "../../../test/helpers/commonData";
import { invalidCartQuantity } from "../../../test/helpers/cartHelper";
import { createItem } from "../../../test/helpers/item/itemHelper";
const url = "/api/cart";

beforeEach(async () => {
  await createDefaultUser();
});

describe("require authentication", () => {
  authenticationTests(app, url, "post");
});

it("return 400 for invalid itemId(body)", async () => {
  await Promise.all(
    invalidUuid.map((invalidUuid) =>
      request(app)
        .post(url)
        .set("Cookie", defaultCookie())
        .send({ shopId: invalidUuid, quantity: 5 })
        .expect(400)
    )
  );
});
it("return 400 for invalid quantity", async () => {
  await Promise.all(
    invalidCartQuantity.map((quantity) =>
      request(app)
        .post(url)
        .set("Cookie", defaultCookie())
        .send({
          itemId: faker.string.uuid(),
          quantity,
        })
        .expect(400)
    )
  );
});
it("return 400 for invalid property", async () => {
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: faker.string.uuid(), quantity: 10, property: "sneaky" })
    .expect(400);
});
it("return 404 if item doesn't exist", async () => {
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: faker.string.uuid(), quantity: 10 })
    .expect(404);
});
it("return 422 if quantity to add exceeds item's current inventory", async () => {
  const [item] = await createItem([{ quantity: 5 }]);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 10 })
    .expect(422);
});

it("successfully added item to cart with status 201", async () => {
  const [item] = await createItem([{ quantity: 5 }]);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 4 })
    .expect(201);
  const cart = await Cart.findOne({
    where: { userId: defaultUser.id, itemId: item.id },
  });
  expect(cart).not.toBeNull();
  expect(cart?.quantity).toEqual(4);
});
it("tries to add quantity if item already exists in cart, results in status code 200 instead of 201", async () => {
  const [item] = await createItem([{ quantity: 5 }]);
  const cart = await Cart.create({
    userId: defaultUser.id,
    itemId: item.id,
    quantity: 2,
  });
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 4 })
    .expect(422);

  await cart.reload();
  expect(cart.quantity).toEqual(2);

  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 3 })
    .expect(200);

  await cart.reload();
  expect(cart.quantity).toEqual(5);
});

it("successfully added item to cart even with the same item in another cart", async () => {
  //create item and user
  const [item] = await createItem([{ quantity: 5 }]);
  const {
    users: [user],
  } = await createUser(1);

  //add item to user cart
  await Cart.create({ userId: user.id, itemId: item.id, quantity: 5 });

  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 4 })
    .expect(201);

  const cart = await Cart.findOne({
    where: { userId: defaultUser.id, itemId: item.id },
  });
  expect(cart).not.toBeNull();
  expect(cart?.quantity).toEqual(4);
});
