import request from "supertest";
import {
  defaultAddress,
  defaultAddressCreateObject,
} from "../../../test/helpers/address/addressData";
import app from "../../../app";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";
import Shop from "../../../models/Shop";
import User from "../../../models/User";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import Address from "../../../models/address";
import UserAddress from "../../../models/UserAddress";
import { assert } from "console";
import ShopAddress from "../../../models/ShopAddress";

const getUrl = (addressId: string) => `/api/address/${addressId}`;
const defaultUrl = getUrl(defaultAddress.id);
const method = "delete";

let defaultShop: Shop | null = null;
let defaultUser: User | null = null;
let defaultShopAddressId: string | undefined;

const getRequest = (url: string, cookies: string[]) =>
  request(app).delete(url).set("Cookie", cookies).send();

const defaultRequest = () => getRequest(defaultUrl, defaultCookie());

beforeEach(async () => {
  defaultUser = await createDefaultUser();
  defaultShop = (await createDefaultShop())[0];

  const [address] = await createAddress([defaultAddress], defaultUser);
  const [defaultShopAddress] = await createAddress(1, defaultShop);

  defaultShopAddressId = defaultShopAddress.id;
  await defaultUser.update({ selectedAddressId: address.id });
});

describe("passes authentication tests", () => {
  authenticationTests(app, defaultUrl, method);
});

it("return 404 if address does not exist", async () => {
  const address = await Address.findByPk(defaultAddress.id);
  await address?.destroy();
  await defaultRequest().expect(404);
});

it("return 403 if address is not owned by the user", async () => {
  const {
    users: [user],
  } = await createUser(1);
  const [address] = await createAddress(1, user);
  await getRequest(getUrl(address.id), defaultCookie()).expect(403);
  const result = await address.reload();
  console.log(result);
  console.log(address);
});

it("return 200 when accessed by admin or root", async () => {
  const {
    users: [root, admin],
  } = await createUser([{ privilege: 0 }, { privilege: 1 }]);
  const [secondAddress] = await createAddress(1, defaultUser!);

  await getRequest(defaultUrl, [forgeCookie(root)]).expect(200);
  await getRequest(getUrl(secondAddress.id), [forgeCookie(admin)]).expect(200);
});

it("return 200 and set selectedAddressId to null when the only userAddress is deleted", async () => {
  await defaultRequest().expect(200);

  const address = await Address.findByPk(defaultAddress.id);
  expect(address).toBe(null);

  await defaultUser?.reload();
  const addresses = await defaultUser?.$get("addresses");

  expect(defaultUser?.selectedAddressId).toBe(null);
  expect(addresses).toHaveLength(0);
});

it("return 200 and set selectedAddressId to next address when available", async () => {
  assert(defaultUser, "defaultUser is not defined");
  //create 4 staggered address to check if correct address is selected after deletion
  const [firstAddress] = await createAddress(1, defaultUser!);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await createAddress(1, defaultUser!);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await createAddress(1, defaultUser!);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await createAddress(1, defaultUser!);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await firstAddress.update({ latitude: 1 });

  await defaultRequest().expect(200);

  await defaultUser?.reload();
  const addresses = await defaultUser?.$get("addresses", {
    order: [["updatedAt", "DESC"]],
  });

  expect(addresses).toHaveLength(4);

  expect(defaultUser?.selectedAddressId).toBe(addresses![0].id);
});

it("return 200 when deleting shop address", async () => {
  assert(defaultShopAddressId, "defaultShopAddress is not defined!");
  assert(defaultShop, "defaultUser is not defined");
  await createAddress(4, defaultShop!);

  await getRequest(getUrl(defaultShopAddressId!), defaultCookie()).expect(200);

  const address = await Address.findByPk(defaultShopAddressId);
  expect(address).toBe(null);

  await defaultShop?.reload({ include: Address });
  expect(defaultShop?.addresses).toHaveLength(4);
});
