import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import { AddressCreationAttribute } from "../../../models/Address";
import {
  defaultAddressCreateObject,
  invalidAddressValues,
} from "../../../test/helpers/address/addressData";
import { AddressCreateType } from "../../../types/addressType";
import { defaultCookie } from "../../../test/helpers/user/userHelper";
import { defaultUser } from "../../../test/helpers/user/userData";
import { pick } from "lodash";
import validationTest from "../../../test/helpers/validationTest.test";
import Shop from "../../../models/Shop";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";

const url = "/api/address/shop";
const method = "post";

const getDefaultRequest = () =>
  request(app).post(url).set("Cookie", defaultCookie());

beforeEach(async () => {
  await createDefaultShop();
});

describe("passes authentication test", () => {
  authenticationTests(app, url, method);
});

it("return 400 for invalid address creation data", async () => {
  await validationTest<AddressCreateType>(
    getDefaultRequest,
    defaultAddressCreateObject,
    invalidAddressValues
  );
});

it("return 409 if address exceed limit", async () => {
  const shop = await Shop.findOne({ where: { userId: defaultUser.id! } });
  await createAddress(20, shop!);
  await getDefaultRequest().send(defaultAddressCreateObject).expect(409);
});

it("return 404 if authenticated user has no shop", async () => {
  const shop = await Shop.findOne({ where: { userId: defaultUser.id! } });
  await shop?.destroy();
  await getDefaultRequest().send(defaultAddressCreateObject).expect(404);
});

it("successfuly create new address for shop", async () => {
  const shop = await Shop.findOne({ where: { userId: defaultUser.id! } });
  await createAddress(5, shop!);

  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(201)
    .expect(({ body }: { body: AddressCreationAttribute }) => {
      expect(
        pick(body, ["latitude", "longitude", "postCode", "detail"])
      ).toEqual(defaultAddressCreateObject);
    });

  const addresses = await shop?.$get("addresses");
  expect(addresses).toHaveLength(6);
});
