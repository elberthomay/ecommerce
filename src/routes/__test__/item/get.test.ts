import request from "supertest";
import { faker } from "@faker-js/faker";

import app from "../../../app";
import User from "../../../models/User";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import Tag from "../../../models/Tag";
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
  const items = await Item.bulkCreate(records);
  return items;
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

it("should return items with the correct tag when using tagId query option", async () => {
  //create list of items
  const items = await createInsertFunction(defaultShopId)(300);
  //create tags
  const tags = await Tag.bulkCreate(
    ["food", "clothing", "jars"].map((name) => ({ name }))
  );
  //add 100 items each to each tag
  await Promise.all(
    tags.map((tag, index) => {
      return tag.$add("items", items.slice(index * 100, index * 100 + 100));
    })
  );

  await request(app)
    .get(url)
    .query({ tagId: tags[0].id, limit: 200 })
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(100);
    });
});
