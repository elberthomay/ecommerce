import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import request from "supertest";
import { faker } from "@faker-js/faker";
import User from "../../../models/User";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";
import {
  anotherUser,
  defaultCookie,
  defaultUser,
} from "../../../test/forgeCookie";
import Cart from "../../../models/Cart";
const url = "/api/cart";

async function insertItems(count: number, shopId: string, quantity: number) {
  const user = await User.create({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    hash: "blaballab",
  });
  await Shop.findOrCreate({
    where: { id: shopId, name: faker.company.name(), userId: user.id },
  });
  const createItemData: () => ItemCreationAttribute = () => ({
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: faker.number.int({ min: 1000, max: 100000000 }),
    quantity: quantity,
    shopId,
  });
  const creationDatas = faker.helpers.multiple(createItemData, { count });
  const records = await Item.bulkCreate(creationDatas);
  return records;
}

const insertDefaultUser = async () => {
  await User.create(defaultUser);
};

beforeEach(async () => {
  await insertDefaultUser();
});

describe("require authentication", () => {
  authenticationTests(app, url, "post");
});

it("return 400 for invalid itemId(body)", async () => {
  const invalidBodies = [
    "",
    "invaliiid",
    "12345",
    "     ",
    faker.string.uuid().concat("e"),
  ].map((itemId) => ({ itemId, quantity: 10 }));
  await Promise.all(
    invalidBodies.map((invalidBody) =>
      request(app)
        .post(url)
        .set("Cookie", defaultCookie())
        .send(invalidBody)
        .expect(400)
    )
  );
});
it("return 400 for invalid quantity", async () => {
  const invalidBodies = [-1, -100, 0, 10000, 99999999].map((quantity) => ({
    itemId: faker.string.uuid(),
    quantity,
  }));
  await Promise.all(
    invalidBodies.map((invalidBody) =>
      request(app)
        .post(url)
        .set("Cookie", defaultCookie())
        .send(invalidBody)
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
  const items = await insertItems(1, faker.string.uuid(), 5);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: items[0].id, quantity: 10 })
    .expect(422);
});

it("successfully added item to cart", async () => {
  const items = await insertItems(1, faker.string.uuid(), 5);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: items[0].id, quantity: 4 })
    .expect(200);
  const cart = await Cart.findOne({
    where: { userId: defaultUser.id, itemId: items[0].id },
  });
  expect(cart).not.toBeNull();
  expect(cart?.quantity).toEqual(4);
});
it("tries to add quantity if item already exists in cart", async () => {
  const items = await insertItems(1, faker.string.uuid(), 5);
  const cart = await Cart.create({
    userId: defaultUser.id,
    itemId: items[0].id,
    quantity: 2,
  });
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: items[0].id, quantity: 4 })
    .expect(422);
  await cart.reload();
  expect(cart.quantity).toEqual(2);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: items[0].id, quantity: 3 })
    .expect(200);
  await cart.reload();
  expect(cart.quantity).toEqual(5);
});

it("successfully added item to cart even with the same item in another cart", async () => {
  const items = await insertItems(1, faker.string.uuid(), 5);
  const user = await User.create({
    id: anotherUser.id,
    email: faker.internet.email(),
    hash: "blabal",
    name: faker.person.fullName(),
  });
  await Cart.create({ userId: user.id, itemId: items[0].id, quantity: 5 });
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: items[0].id, quantity: 4 })
    .expect(200);
  const cart = await Cart.findOne({
    where: { userId: defaultUser.id, itemId: items[0].id },
  });
  expect(cart).not.toBeNull();
  expect(cart?.quantity).toEqual(4);
});
