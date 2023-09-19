import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import User from "../../../models/User";
import { defaultCookie, defaultUser } from "../../../test/forgeCookie";
import { ItemCreationAttribute } from "../../../models/Item";

const url = "/api/shop/item";
const defaultItemData: ItemCreationAttribute = {
  name: "Blue Pencil",
  description: "I'ts a blue pencil with a good",
  price: 100000,
  quantity: 10,
};

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post");
});

it("should return 404 when shop is unactivated", async () => {
  await User.create(defaultUser);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send(defaultItemData)
    .expect(404);
});
