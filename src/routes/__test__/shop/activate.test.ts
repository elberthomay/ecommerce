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
} from "../../../test/helpers/shop/shopHelper";
import _ from "lodash";
import { invalidShopNames } from "../../../test/helpers/shop/shopData";

const url = "/api/shop";
const getRequest = () => request(app).post(url).set("Cookie", defaultCookie());

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post");
});

it("should return 400 with invalid shop names", async () => {
  await createDefaultUser();

  await Promise.all(
    invalidShopNames.map((name) => getRequest().send({ name }).expect(400))
  );
});

it("should return 409(conflict) if name already exists", async () => {
  const [shop] = await createShop(1);

  await getRequest().send({ name: shop.name }).expect(409);
});

it("should return 409(conflict) if store has been activated", async () => {
  await createDefaultShop();
  await getRequest().send({ name: "another shop name" }).expect(409);
});

it("should successfuly create shop when authenticated(status code 201), has yet to activate shop and supplied with correct name", async () => {
  const user = await createDefaultUser();
  const { name, description } = defaultShop;
  await getRequest()
    .send({ name, description })
    .expect(201)
    .expect(({ body }) => {
      expect(_.pick(body, ["userId", "name", "description"])).toEqual({
        userId: user.id,
        name: defaultShop.name,
        description: defaultShop.description,
      });
    });

  const shop = await Shop.findOne({ where: { userId: user.id } });
  expect(shop).toBeTruthy();
});
