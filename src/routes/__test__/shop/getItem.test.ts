import request from "supertest";
import User from "../../../models/User";
import app from "../../../app";
import Shop from "../../../models/Shop";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import { faker } from "@faker-js/faker";

const defaultShopId = "2e9ecb74-c898-428a-84f4-03f6d827a335";
const url = "/api/shop/" + defaultShopId + "/item";

const anotherShopId = "f8b64acd-b3aa-4672-b873-c188cd5e2270";

async function insertItemDatas(count: number, shopId: string) {
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
    quantity: faker.number.int({ min: 1, max: 9999 }),
    shopId,
  });
  const records = faker.helpers.multiple(createItemData, { count });
  await Item.bulkCreate(records);
  return records;
}

it("should return an empty array when there are no items", async () => {
  await request(app)
    .get(`/api/shop/${defaultShopId}/item`)
    .send()
    .expect(200, []);
});

it("should return an empty array when there are no items with a specified limit", async () => {
  await request(app)
    .get(`/api/shop/${defaultShopId}/item?limit=40`)
    .send()
    .expect(200, []);
});

it("should return an empty array when there are no items with a specified limit and page", async () => {
  await request(app)
    .get(`/api/shop/${defaultShopId}/item?limit=40&page=3`)
    .send()
    .expect(200, []);
});

it("should return an empty array when there are 100 items in another shop", async () => {
  // Create another shop with 100 items using your data function
  await insertItemDatas(100, anotherShopId);
  await request(app)
    .get(`/api/shop/${defaultShopId}/item`)
    .send()
    .expect(200, []);
});

it("should return 80 items when there are 100 items in the shop", async () => {
  // Create 100 items in the shop using your data function
  await insertItemDatas(100, defaultShopId);
  await request(app)
    .get(`/api/shop/${defaultShopId}/item`)
    .send()
    .expect(200)
    .expect((res) => {
      expect(res.body.length).toBe(80);
    });
});

it("should return 20 items when there are 100 items in the shop and page is 2", async () => {
  // Create 100 items in the shop using your data function
  await insertItemDatas(100, defaultShopId);
  await request(app)
    .get(`/api/shop/${defaultShopId}/item?page=2`)
    .send()
    .expect(200)
    .expect((res) => {
      expect(res.body.length).toBe(20);
    });
});

it("should return  items when there are 100 items in the shop and page is 3", async () => {
  // Create 100 items in the shop using your data function
  await insertItemDatas(100, defaultShopId);
  await request(app)
    .get(`/api/shop/${defaultShopId}/item?page=3`)
    .send()
    .expect(200, []);
});

it("should return 40 items when there are 100 items in the shop and limit is 40", async () => {
  // Create 100 items in the shop using your data function
  await insertItemDatas(100, defaultShopId);
  await request(app)
    .get(`/api/shop/${defaultShopId}/item?limit=40`)
    .send()
    .expect(200)
    .expect((res) => {
      expect(res.body.length).toBe(40);
    });
});

it("should return 10 items when there are 100 items in the shop, limit is 30, and page is 4", async () => {
  // Create 100 items in the shop using your data function
  await insertItemDatas(100, defaultShopId);
  await request(app)
    .get(`/api/shop/${defaultShopId}/item?limit=30&page=4`)
    .send()
    .expect(200)
    .expect((res) => {
      expect(res.body.length).toBe(10);
    });
});

it("should return status code 400 for invalid limit values", async () => {
  const invalidLimits = [-1, 0, 201];
  for (const limit of invalidLimits) {
    await request(app)
      .get(`/api/shop/${defaultShopId}/item?limit=${limit}`)
      .send()
      .expect(400);
  }
});

it("should return status code 400 for invalid page values", async () => {
  const invalidPages = [-1, 0, 5001];
  for (const page of invalidPages) {
    await request(app)
      .get(`/api/shop/${defaultShopId}/item?page=${page}`)
      .send()
      .expect(400);
  }
});
