import request from "supertest";
import app from "../../../app";
import {
  createDefaultShop,
  defaultShop,
} from "../../../test/helpers/shop/shopHelper";
import { invalidUuid } from "../../../test/helpers/commonData";
import { faker } from "@faker-js/faker";
import { defaultCookie } from "../../../test/helpers/user/userHelper";
import { pick } from "lodash";
const getUrl = (shopId: string) => `/api/shop/${shopId}`;
const method = "get";
const getRequest = (shopId: string, cookies: string[]) =>
  request(app).get(getUrl(shopId)).set("Cookie", cookies);

it("return 400 when shopId is invalid", async () => {
  await Promise.all(
    invalidUuid.map((id) => getRequest(id, []).send().expect(400))
  );
});

it("return 400 when shop does not exist", async () => {
  await getRequest(faker.string.uuid(), []).send().expect(404);
});

it("return 200 with shop data when id is correct", async () => {
  await createDefaultShop();
  await getRequest(defaultShop.id!, defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(pick(body, ["id", "name", "description"])).toEqual(
        pick(defaultShop, ["id", "name", "description"])
      );
    });
});
