import app from "../../../app";
import { defaultAddress } from "../../../test/helpers/address/addressData";
import request from "supertest";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import User from "../../../models/User";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import { invalidUuid } from "../../../test/helpers/commonData";
import Address from "../../../models/address";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";

const getUrl = (addressId: string) => `/api/address/select/${addressId}`;
const defaultUrl = getUrl(defaultAddress.id);
const method = "post";

const getRequest = (url: string, cookie: string[]) =>
  request(app).post(url).set("Cookie", cookie).send();
const getDefaultRequest = () => getRequest(defaultUrl, defaultCookie());

let defaultUser: User;
let defaultAddresses: Address[];

beforeEach(async () => {
  defaultUser = await createDefaultUser();
  defaultAddresses = await createAddress(
    [defaultAddress].concat(Array(5).fill({})),
    defaultUser
  );
  await defaultUser.update({ selectedAddressId: defaultAddresses[1].id });
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

it("return 404 when address is not in user's userAddress", async () => {
  const {
    users: [user],
  } = await createUser(1);
  const [address] = await createAddress(1, user);
  const [shop] = await createDefaultShop();
  const [shopAddress] = await createAddress(1, shop);

  await getRequest(getUrl(address.id), defaultCookie()).expect(404);
  await getRequest(getUrl(shopAddress.id), defaultCookie()).expect(404);
});

it("return 200 and successfully changed selected address ", async () => {
  await getDefaultRequest().expect(200);
  await defaultUser.reload();
  expect(defaultUser.selectedAddressId).toBe(defaultAddresses[0].id);
});
