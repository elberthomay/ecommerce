import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";
import { createShop } from "../../../test/helpers/shop/shopHelper";

const url = "/api/address/shop";
const method = "get";
const getDefaultRequest = () =>
  request(app).get(url).set("Cookie", defaultCookie());

describe("passes authentication tests", () => {
  authenticationTests(app, url, method);
});

it("return [] when there's no address in user's shop", async () => {
  await createDefaultShop();
  const [shop] = await createShop(1);
  await createAddress(5, shop);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toEqual([]));
});

it("return 5 addresses when there's 5 address in user's shop", async () => {
  const [shop] = await createShop(1);
  const [defaultShop] = await createDefaultShop();
  await createAddress(5, shop);
  await createAddress(5, defaultShop);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toHaveLength(5));
});
