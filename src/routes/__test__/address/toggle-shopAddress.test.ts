import app from "../../../app";
import { defaultAddress } from "../../../test/helpers/address/addressData";
import request from "supertest";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import { invalidUuid } from "../../../test/helpers/commonData";
import Address from "../../../models/address";
import {
  createDefaultShop,
  createShop,
} from "../../../test/helpers/shop/shopHelper";
import Shop from "../../../models/Shop";
import ShopAddress from "../../../models/ShopAddress";

const getUrl = (addressId: string) => `/api/address/toggle/${addressId}`;
const defaultUrl = getUrl(defaultAddress.id);
const method = "post";

const getRequest = (url: string, cookie: string[]) =>
  request(app).post(url).set("Cookie", cookie).send();

const getDefaultRequest = () => getRequest(defaultUrl, defaultCookie());

let defaultShop: Shop;
let defaultAddresses: Address[];

beforeEach(async () => {
  defaultShop = (await createDefaultShop())[0];
  defaultAddresses = await createAddress(
    [defaultAddress].concat(Array(5).fill({})),
    defaultShop
  );
});

describe("passes auth test", () => {
  authenticationTests(app, defaultUrl, method);
});

it("return 400 on invalid addressId", async () => {
  await Promise.all(
    invalidUuid.map((uuid) =>
      getRequest(getUrl(uuid), defaultCookie()).expect(400)
    )
  );
});

it("return 404 if address does not exist", async () => {
  await defaultAddresses[0].destroy();
  await getDefaultRequest().expect(404);
});

it("return 404 when address is not in user's shopAddress", async () => {
  const [shop] = await createShop(1);
  const [address] = await createAddress(1, shop);

  const user = await createDefaultUser();
  const [userAddress] = await createAddress(1, user);

  await getRequest(getUrl(address.id), defaultCookie()).expect(404);
  await getRequest(getUrl(userAddress.id), defaultCookie()).expect(404);
});

it("return 200 and successfully toggle selected status of shopAddress ", async () => {
  await getDefaultRequest().expect(200);
  await Promise.all(
    defaultAddresses.map((address) => address.reload({ include: ShopAddress }))
  );

  //first one false, the rest all true
  expect(defaultAddresses[0].shopAddress?.selected).toBe(false);
  expect(
    defaultAddresses
      .slice(1)
      .map((address) => address.shopAddress?.selected)
      .every((selected) => selected)
  ).toBe(true);

  await getDefaultRequest().expect(200);
  await Promise.all(
    defaultAddresses.map((address) => address.reload({ include: ShopAddress }))
  );
  //back to all true
  expect(
    defaultAddresses
      .map((address) => address.shopAddress?.selected)
      .every((selected) => selected)
  ).toBe(true);
});
