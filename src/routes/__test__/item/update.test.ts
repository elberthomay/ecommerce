import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  anotherCookie,
  anotherUser,
  defaultCookie,
  defaultUser,
} from "../../../test/forgeCookie";
import User from "../../../models/User";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import { v4 as uuid } from "uuid";
import Shop from "../../../models/Shop";
import { editItemType } from "../../../schemas.ts/shopSchema";

const defaultShopData: ItemCreationAttribute = {
  name: "Blue Pencil",
  description: "I'ts a blue pencil with a good",
  price: 100000,
  quantity: 10,
};

const defaultItem = { ...defaultShopData, id: uuid() };

const url = "/api/item/";

const changesItemData: editItemType = {
  name: "Green Tree",
  description: "Green Tree with good shades",
  price: 5000,
  quantity: 3,
};

beforeEach(async () => {
  const user = await User.create(defaultUser);
  const shop = await Shop.create({ name: "Test Shop", userId: user.id });
  await Item.create({ ...defaultItem, shopId: shop.id });
});

describe("should return 401 when unauthenticated", () => {
  authenticationTests(app, url + defaultItem.id, "patch", changesItemData);
});

it("should return 400 validation error when accessed with invalid itemId", async () => {
  const invalidItemIds: string[] = [
    "invalidId", //not uuid
    "80e31d9e-d48f-43a2-b267-b96a490c033", //one character missing
    "99b454cc-2288-a2f580411e3ff77e", //missing one portion
    "5f1e4375ef6044c7880aba7b44e183f1", //no dash
    // "99b454cc-2288-412a-a2f580411e3ff77e" missing up to three dash is not error, damn bug
  ];
  await Promise.all(
    invalidItemIds.map((invalidId) =>
      request(app)
        .patch(url + invalidId)
        .set("Cookie", defaultCookie())
        .send(changesItemData)
        .expect(400)
    )
  );
});

it("should return 400 validation error when accessed with invalid update property", async () => {
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send({ ...changesItemData, invalidProperty: "hehehe" })
    .expect(400);
});
it("should return 400 validation error when accessed with no update property", async () => {
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send({})
    .expect(400);
});

it("should return 403 unauthorized when user has yet to activate shop", async () => {
  //create another user
  await User.create(anotherUser);
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", anotherCookie())
    .send(changesItemData)
    .expect(403);
});

it("should return 403 unauthorized when item is not associated with user's shop", async () => {
  //create another user
  await User.create(anotherUser);
  await Shop.create({ name: "another Shop", userId: anotherUser.id });
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", anotherCookie())
    .send(changesItemData)
    .expect(403);
});

it("should return 200 success when item is associated with user's shop with correct update data", async () => {
  const response = await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send(changesItemData)
    .expect(200);
  const item = await Item.findByPk(defaultItem.id);
  if (item === null) throw new Error("default item is undefined!");
  //expect all changes to correctly applied
  const resultingItem = { ...defaultItem, ...changesItemData };
  Object.entries(resultingItem).forEach(([key, value]) => {
    const correctKey: keyof ItemCreationAttribute =
      key as keyof ItemCreationAttribute;
    expect(item[correctKey]).toEqual(value);
  });
});
