import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  anotherCookie,
  anotherUser,
  defaultCookie,
  defaultUser,
} from "../../../test/forgeCookie";
import User from "../../../models/User";
import { faker } from "@faker-js/faker";
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

describe("require authentication", () => {
  authenticationTests(app, url, "get");
});

const insertDefaultUser = async () => {
  await User.create(defaultUser);
};

beforeEach(async () => {
  await insertDefaultUser();
});

it("return empty array if there's no item in cart", async () => {
  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual([]);
    });
});
it("return empty array if there's no item in user's cart", async () => {
  const items = await insertItems(10, faker.string.uuid(), 5);
  const otherUser = await User.create(anotherUser);
  otherUser.$add("itemsInCart", items, { through: { quantity: 5 } });
  console.log(await Cart.findAll({ where: { userId: otherUser.id } }));
  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual([]);
    });
});
it("return one item with cart data if there's 1 item user's cart", async () => {
  const items = await insertItems(10, faker.string.uuid(), 5);
  const otherUser = await User.create(anotherUser);
  await otherUser.$add("itemsInCart", items, { through: { quantity: 5 } });
  const user = await User.findOne({ where: { id: defaultUser.id } });
  if (!user) throw new Error("default user not created");
  await user.$add("itemsInCart", items[0]);
  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(1);
    });
});
it("return 10 item if there's 10 item in user's cart", async () => {
  const items = await insertItems(10, faker.string.uuid(), 5);
  const otherUser = await User.create(anotherUser);
  await otherUser.$add("itemsInCart", items, { through: { quantity: 5 } });
  const user = await User.findOne({ where: { id: defaultUser.id } });
  if (!user) throw new Error("default user not created");
  await user.$add("itemsInCart", items);
  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(10);
    });
});
