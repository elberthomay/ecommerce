import request from "supertest";
import app from "../../../app";
import {
  createDefaultShop,
  createShop,
  defaultShop,
  defaultShopUpdate,
} from "../../../test/helpers/shop/shopHelper";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import { invalidUuid } from "../../../test/helpers/commonData";
import validationTest from "../../../test/helpers/validationTest.test";
import { invalidShopValue } from "../../../test/helpers/shop/shopData";
import { faker } from "@faker-js/faker";
import { pick } from "lodash";

const getUrl = (shopId: string) => `/api/shop/${shopId}`;
const method = "patch";

const defaultRequest = (option?: { shopId?: string; cookies?: string[] }) =>
  request(app)
    .patch(getUrl(option?.shopId ?? defaultShop.id!))
    .set("Cookie", option?.cookies ?? defaultCookie())
    .send(defaultShopUpdate);

beforeEach(async () => {
  await createDefaultShop();
});

describe("passes auth test", () => {
  authenticationTests(app, getUrl(defaultShop.id!), method, defaultShopUpdate);
});

it("return 400 from invalid shopId", async () => {
  await Promise.all(
    invalidUuid.map((shopId) => defaultRequest({ shopId }).expect(400))
  );
});

it("return 400 from invalid body", async () => {
  await validationTest(defaultRequest, {}, invalidShopValue);
});

it("return 404 when shop does not exist", async () => {
  await defaultRequest({ shopId: faker.string.uuid() })
    .expect(({ body }) => console.log(JSON.stringify(body)))
    .expect(404);
});

it("return 403 when accessing shop not created by the user", async () => {
  const [shop] = await createShop(1);
  await defaultRequest({ shopId: shop.id }).expect(403);
});

it("return 200 when updated by root or admin", async () => {
  const { users } = await createUser([{ privilege: 0 }, { privilege: 1 }]);
  await Promise.all(
    users.map((user) =>
      defaultRequest({ cookies: [forgeCookie(user)] }).expect(200)
    )
  );
});

it("return 200 and correctly updated shop", async () => {
  await defaultRequest()
    .expect(200)
    .expect(async ({ body }) => {
      expect(pick(body, ["name", "description"])).toEqual(defaultShopUpdate);
      const shop = await createDefaultShop();
      expect(pick(shop, ["name", "description"])).toEqual(defaultShopUpdate);
    });
});
