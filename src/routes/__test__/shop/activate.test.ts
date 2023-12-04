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
  defaultShop,
} from "../../../test/helpers/shopHelper";
import _ from "lodash";
import { invalidShopNames } from "../../../test/helpers/shop/shopData";

const url = "/api/shop";

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post");
});

it("should return 400 with invalid shop names", async () => {
  await createDefaultUser();

  await Promise.all(
    invalidShopNames.map((name) =>
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

it("should successfuly create shop when authenticated(status code 201), has yet to activate shop and supplied with correct name", async () => {
  const user = await createDefaultUser();
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send({ name: defaultShop.name })
    .expect(201)
    .expect(({ body }) => {
      expect(_.pick(body, ["userId", "name"])).toEqual({
        userId: user.id,
        name: defaultShop.name,
      });
    });

  const shop = await Shop.findOne({ where: { userId: user.id } });
  expect(shop).toBeTruthy();
});
