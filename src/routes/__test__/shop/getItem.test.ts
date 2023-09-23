import request from "supertest";
import User from "../../../models/User";
import app from "../../../app";
import Shop from "../../../models/Shop";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import { faker } from "@faker-js/faker";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";

const defaultShopId = "2e9ecb74-c898-428a-84f4-03f6d827a335";
const url = "/api/shop/" + defaultShopId + "/item";

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
  const items = await Item.bulkCreate(records);
  return items;
};

describe("Test limit and paging", () => {
  pagingAndLimitTests(app, url, createInsertFunction(defaultShopId));
});

describe("Test limit and paging with items from other shop", () => {
  beforeEach(async () => {
    await createInsertFunction(anotherShopId)(100);
  });
  pagingAndLimitTests(app, url, createInsertFunction(defaultShopId));
});
