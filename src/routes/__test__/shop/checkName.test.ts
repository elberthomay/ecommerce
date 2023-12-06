import app from "../../../app";
import request from "supertest";
import { invalidShopNames } from "../../../test/helpers/shop/shopData";
import {
  createDefaultShop,
  defaultShop,
} from "../../../test/helpers/shop/shopHelper";

const createUrl = (itemName: string) =>
  `/api/shop/checkName/${encodeURIComponent(itemName)}`;

const createRequest = (url: string) => request(app).get(url).send();

it("return 400 when given invalid shop name", async () => {
  await Promise.all(
    invalidShopNames
      .filter((n) => !!n)
      .map((shopName) => createRequest(createUrl(shopName!)).expect(400))
  );
});

it("return { exist: true } with 200 if shop with provided name exist", async () => {
  await createDefaultShop();
  await createRequest(createUrl(defaultShop.name))
    .expect(200)
    .expect(({ body }) => expect(body).toEqual({ exist: true }));
});

it("return { exist: false } with 200 if shop with provided name exist", async () => {
  await createDefaultShop();
  await createRequest(createUrl("other name"))
    .expect(200)
    .expect(({ body }) => expect(body).toEqual({ exist: false }));
});
