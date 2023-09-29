import request from "supertest";
import app from "../../../app";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import Shop from "../../../models/Shop";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createDefaultShop,
  createShop,
} from "../../../test/helpers/shopHelper";

const url = "/api/shop";

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post");
});

it("should return 400 if name is empty, doesn't exist, or more than 255 character", async () => {
  const invalidNames = [undefined, "", "a".repeat(256)];
  await createDefaultUser();

  await Promise.all(
    invalidNames.map((name) =>
      request(app)
        .post(url)
        .set("Cookie", defaultCookie())
        .send({ name })
        .expect(400)
    )
  );
});

it("should return 409(conflict) if name already exists", async () => {
  const [shop] = await createShop(1);

  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: shop.name })
    .expect(409);
});

it("should return 409(conflict) if store has been activated", async () => {
  await createDefaultShop();
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: "another shop name" })
    .expect(409);
});

it("should successfuly create shop when authenticated, has yet to activate shop and supplied with correct name", async () => {
  const user = await createDefaultUser();
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: "myShop" })
    .expect(200);

  const shop = await Shop.findOne({ where: { userId: user.id } });
  expect(shop).toBeTruthy();
});
