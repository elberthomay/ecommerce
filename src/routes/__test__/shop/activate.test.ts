import request from "supertest";
import User from "../../../models/User";
import app from "../../../app";
import {
  anotherCookie,
  anotherUser,
  defaultCookie,
  defaultUser,
} from "../../../test/forgeCookie";
import Shop from "../../../models/Shop";
import authenticationTests from "../../../test/authenticationTests.test";

const url = "/api/shop";

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post");
});

it("should return 400 if name is empty, doesn't exist, or more than 255 character", async () => {
  await User.create(defaultUser);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({})
    .expect(400);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: "" })
    .expect(400);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: "a".repeat(256) })
    .expect(400);
});

it("should return 409(conflict) if name already exists", async () => {
  const name = "myFood";
  const user = await User.create(defaultUser);
  await Shop.create({ name: name, userId: user.id });
  await User.create(anotherUser);
  await request(app)
    .post(url)
    .set("Cookie", anotherCookie())
    .send({ name: name })
    .expect(409);
}, 60000);

it("should return 409(conflict) if store has been activated", async () => {
  const user = await User.create(defaultUser);
  await Shop.create({ name: "myFood", userId: user.id });
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: "myShop" })
    .expect(409);
});

it("should successfuly create shop when authenticated, has yet to activate shop and supplied with correct name", async () => {
  const user = await User.create(defaultUser);
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: "myShop" })
    .expect(200);

  const shop = await Shop.findOne({ where: { userId: user.id } });
  expect(shop).toBeTruthy();
});
