import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import { faker } from "@faker-js/faker";
import request from "supertest";
import {
  anotherUser,
  defaultCookie,
  defaultUser,
} from "../../../test/forgeCookie";
import User from "../../../models/User";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";
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

describe("require authentication", () => {
  authenticationTests(app, url, "delete");
});
it("return 400 for invalid itemId(body)", async () => {
  const invalidBodies = [
    "",
    "invaliiid",
    "12345",
    "     ",
    faker.string.uuid().concat("e"),
  ].map((itemId) => ({ itemId }));
  await Promise.all(
    invalidBodies.map((invalidBody) =>
      request(app)
        .delete(url)
        .set("Cookie", defaultCookie())
        .send(invalidBody)
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
  const [item] = await insertItems(1, faker.string.uuid(), 5);
  await insertDefaultUser();
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
  const [item] = await insertItems(1, faker.string.uuid(), 5);
  await insertDefaultUser();
  await User.create(anotherUser);
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
