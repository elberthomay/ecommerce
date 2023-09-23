import { faker } from "@faker-js/faker";
import request from "supertest";
import app from "../../../app";
import Item from "../../../models/Item";
import { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";
import User from "../../../models/User";

const defaultItemId = "2e9ecb74-c898-428a-84f4-03f6d827a335";
const url = "/api/item/";

const anotherShopId = "f8b64acd-b3aa-4672-b873-c188cd5e2270";

async function insertItems(count: number, shopId: string) {
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
  const creationDatas = faker.helpers.multiple(createItemData, { count });
  const records = await Item.bulkCreate(creationDatas);
  return records;
}

it("should return 404 when there are no items", async () => {
  const response = await request(app)
    .get(`/api/item/${defaultItemId}`)
    .expect(404);
});

it("should return 404 when there are 10 items but using default item ID", async () => {
  await insertItems(10, faker.string.uuid());
  const response = await request(app)
    .get(`/api/item/${defaultItemId}`)
    .expect(404);
});

it("should return 404 when there are 10 items from one user and 10 from another, using default item ID", async () => {
  await insertItems(10, faker.string.uuid());
  await insertItems(10, faker.string.uuid());
  const response = await request(app)
    .get(`/api/item/${defaultItemId}`)
    .expect(404);
});

it("should return 200 when there is 1 item from 1 user using the created item ID", async () => {
  const records = await insertItems(1, faker.string.uuid());
  const testItem = records[0].get({ plain: true }); // Use the ID of the created item
  const response = await request(app)
    .get(`/api/item/${testItem.id}`)
    .expect(200)
    .expect((res) => {
      res.body.createdAt = new Date(Date.parse(res.body.createdAt));
      res.body.updatedAt = new Date(Date.parse(res.body.updatedAt));
      expect(res.body).toEqual(testItem); // Check if the response ID matches the requested item ID
    });
});

it("should return 200 when there are 10 items created and using one of the created item IDs", async () => {
  const records = await insertItems(10, faker.string.uuid());
  const testItem = records[0].get({ plain: true }); // Use one of the created item IDs
  const response = await request(app)
    .get(`/api/item/${testItem.id}`)
    .expect(200)
    .expect((res) => {
      res.body.createdAt = new Date(Date.parse(res.body.createdAt));
      res.body.updatedAt = new Date(Date.parse(res.body.updatedAt));
      expect(res.body).toEqual(testItem); // Check if the response ID matches the requested item ID
    });
});
