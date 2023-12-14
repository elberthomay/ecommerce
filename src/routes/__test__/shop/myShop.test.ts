import app from "../../../app";
import request from "supertest";
import { omit, pick } from "lodash";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import {
  createDefaultShop,
  defaultShop,
} from "../../../test/helpers/shop/shopHelper";
import Shop from "../../../models/Shop";

const url = "/api/shop/myShop";
const method = "get";
const createDefaultRequest = () =>
  request(app).get(url).set("Cookie", defaultCookie()).send();

beforeEach(async () => {
  await createDefaultUser();
});

describe("should pass authentication test", () => {
  authenticationTests(app, url, method);
});

it("return 200 with empty object if user's shop not activated", async () => {
  await createDefaultRequest()
    .expect(({ body }) => console.log(body))
    .expect(200)
    .expect(({ body }) => expect(body).toEqual({}));
});

it("return 200 with correct shop data if user shop is activated", async () => {
  try {
    await createDefaultShop();
  } catch (e) {
    console.log(e);
  }
  await createDefaultRequest()
    .expect(200)
    .expect(({ body }: { body: Shop }) => {
      expect(pick(body, ["name"])).toEqual({ name: defaultShop.name });
    });
});
