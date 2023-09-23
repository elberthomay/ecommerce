import request from "supertest";
import { faker } from "@faker-js/faker";

import app from "../../../app";
import User from "../../../models/User";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
const url = "/api/item";

const defaultShopId = "2e9ecb74-c898-428a-84f4-03f6d827a335";

const anotherShopId = "f8b64acd-b3aa-4672-b873-c188cd5e2270";

const createInsertFunction = (shopId: string) => async (count: number) => {
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
};

describe("test basic paging and limit", () => {
  pagingAndLimitTests(app, url, createInsertFunction(defaultShopId));
});

it("should return item from all shop", async () => {
  await createInsertFunction(defaultShopId)(40);
  await createInsertFunction(anotherShopId)(40);
  await createInsertFunction("f8b64acd-b3aa-4672-b823-c188cd5e3270")(40);
  await request(app)
    .get(url)
    .query({ limit: 120 })
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(120);
    });
  await request(app)
    .get(url)
    .query({ limit: 80 })
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(80);
    });
});
