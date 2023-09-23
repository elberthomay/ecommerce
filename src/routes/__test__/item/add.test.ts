import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import User from "../../../models/User";
import { defaultCookie, defaultUser } from "../../../test/forgeCookie";
import { ItemCreationAttribute } from "../../../models/Item";
import Shop from "../../../models/Shop";

const url = "/api/item";
const defaultItemData: ItemCreationAttribute = {
  name: "Blue Pencil",
  description: "I'ts a blue pencil with a good",
  price: 100000,
  quantity: 10,
};

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post", defaultItemData);
});

it("should return 400 with missing property, empty property,unknown property, wrong type, and negative price or quantity", async () => {
  const user = await User.create(defaultUser);
  await Shop.create({ name: "testShop", userId: user.id });
  const missingProperty: any = { ...defaultItemData };
  delete missingProperty.name;
  const invalidBodies = [
    missingProperty,
    { ...defaultItemData, description: "" }, //empty property
    { ...defaultItemData, invalidProperty: "some data" }, //invalid property
    { ...defaultItemData, name: 10 }, //invalid name type
    { ...defaultItemData, quantity: "hey" }, //invalid quantity type
    { ...defaultItemData, price: -100000 }, //negative price
    { ...defaultItemData, quantity: -5 }, //negative quantity
  ];
  await Promise.all(
    invalidBodies.map((invalidBody) =>
      request(app)
        .post(url)
        .set("Cookie", defaultCookie())
        .send(invalidBody)
        .expect(400)
    )
  );
});

it("should return 404 when shop is unactivated", async () => {
  await User.create(defaultUser);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send(defaultItemData)
    .expect(404);
});
