import app from "../../../app";
import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  anotherCookie,
  anotherUser,
  defaultCookie,
  defaultUser,
} from "../../../test/forgeCookie";
import User from "../../../models/User";
import Shop from "../../../models/Shop";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import { v4 as uuid } from "uuid";

const url = "/api/item/";
const method = "delete";

const defaultShopData: ItemCreationAttribute = {
  name: "Blue Pencil",
  description: "I'ts a blue pencil with a good",
  price: 100000,
  quantity: 10,
};

const defaultItem = { ...defaultShopData, id: uuid() };

beforeEach(async () => {
  const user = await User.create(defaultUser);
  const shop = await Shop.create({ name: "Test Shop", userId: user.id });
  await Item.create({ ...defaultItem, shopId: shop.id });
});

// describe("should return 401 when authentication error happens", () => {
//   authenticationTests(app, url + defaultUser.id, method);
// });

it("should return 400 validation error when accessed with invalid itemId", async () => {
  const invalidItemId: string[] = [
    "invalidId", //not uuid
    "80e31d9e-d48f-43a2-b267-b96a490c033", //one character missing
    "99b454cc-2288-412a-80411e3ff77e", //missing one portion
    "99b454cc2288412aa2f580411e3ff77e", //no dash
  ];
  await Promise.all(
    invalidItemId.map((invalidId) =>
      request(app)
        .delete(url + invalidId)
        .set("Cookie", defaultCookie())
        .send()
        .expect(400)
    )
  );
});

it("should return 404 not found error when itemId does not exist in db", async () => {
  const nonexistentId = "99b454cc-2288-412a-a2f5-80411e3ff77e";
  await request(app)
    .delete(url + nonexistentId)
    .set("Cookie", defaultCookie())
    .send()
    .expect(404);
});

it("should return 403 unauthorized when item is not associated with user's shop", async () => {
  //create another user
  await User.create(anotherUser);
  await Shop.create({ name: "another Shop", userId: anotherUser.id });
  await request(app)
    .delete(url + defaultItem.id)
    .set("Cookie", anotherCookie())
    .send()
    .expect(403);
});

it("should return 200 and succesfully delete item", async () => {
  await request(app)
    .delete(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200);
  const item = await Item.findByPk(defaultItem.id);
  expect(item).toBeNull();
});
