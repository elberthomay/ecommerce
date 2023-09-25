import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import User from "../../../models/User";
import { defaultCookie, defaultUser } from "../../../test/forgeCookie";
import Shop from "../../../models/Shop";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import { faker } from "@faker-js/faker";
import request from "supertest";
import Cart from "../../../models/Cart";
const url = "/api/cart";

describe("require authentication", () => {
  authenticationTests(app, url, "patch");
});

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
        .patch(url)
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
        .patch(url)
        .set("Cookie", defaultCookie())
        .send(invalidBody)
        .expect(400)
    )
  );
});
it("return 404 if item doesn't exist", async () => {
  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: faker.string.uuid(), quantity: 10 })
    .expect(404);
});
it("return 409 if quantity to add exceeds item's current inventory", async () => {
  const [item] = await insertItems(1, faker.string.uuid(), 5);
  await insertDefaultUser();
  const cart = await Cart.create({ userId: defaultUser.id, itemId: item.id });
  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 6 })
    .expect(409);
});
it("will delete item from cart if quantity is set to 0", async () => {
  const [item] = await insertItems(1, faker.string.uuid(), 5);
  await insertDefaultUser();
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
  const [item] = await insertItems(1, faker.string.uuid(), 5);
  await insertDefaultUser();
  const cart = await Cart.create({ userId: defaultUser.id, itemId: item.id });
  await request(app)
    .patch(url)
    .set("Cookie", defaultCookie())
    .send({ itemId: item.id, quantity: 5 })
    .expect(200);
  expect(
    (await Cart.findOne({ where: { userId: defaultUser.id, itemId: item.id } }))
      ?.quantity
  ).toEqual(5);
});
