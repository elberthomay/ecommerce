import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  defaultAddress,
  defaultAddressCreateObject,
  invalidAddressValues,
} from "../../../test/helpers/address/addressData";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";
import User from "../../../models/User";
import { defaultUser } from "../../../test/helpers/user/userData";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import validationTest from "../../../test/helpers/validationTest.test";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import Address from "../../../models/Address";
import { omit, pick } from "lodash";
import { invalidUuid } from "../../../test/helpers/commonData";
import {
  addressOutputArraySchema,
  addressOutputSchema,
} from "../../../schemas.ts/addressSchema";

const getUrl = (addressId: string) => `/api/address/${addressId}`;
const defaultUrl = getUrl(defaultAddress.id);
const method = "patch";

const getRequest = (url: string, cookie: string[]) =>
  request(app).patch(url).set("Cookie", cookie);
const getDefaultRequest = () => getRequest(defaultUrl, defaultCookie());

const defaultShopAddressId = "f1603913-57a5-45f2-8a56-b4a1703f5528";

beforeEach(async () => {
  const [defaultShop] = await createDefaultShop();
  const user = await createDefaultUser();
  try {
    const [userAddress] = await createAddress(
      [{ id: defaultAddress.id }],
      user
    );
    await user?.update({ selectedAddressId: userAddress.id });
    await createAddress([{ id: defaultShopAddressId }], defaultShop);
  } catch (e) {
    console.log(e);
  }
});

describe("passes authentication tests", () => {
  authenticationTests(app, defaultUrl, method, defaultAddressCreateObject);
});

it("return 400 on invalid addressId", async () => {
  await Promise.all(
    invalidUuid.map((uuid) =>
      getRequest(getUrl(uuid), defaultCookie())
        .send(defaultAddressCreateObject)
        .expect(400)
    )
  );
});

it("return 400 on validation error", async () => {
  await validationTest(getDefaultRequest, {}, invalidAddressValues);
});

it("return 403 when updating address not owned by user", async () => {
  const {
    users: [user],
  } = await createUser(1);
  const addresses = await createAddress(4, user);
  await getRequest(getUrl(addresses[0].id), defaultCookie())
    .send(defaultAddressCreateObject)
    .expect(403);
});

it("return 200 when updated by admin or root", async () => {
  const { users } = await createUser([{ privilege: 0 }, { privilege: 1 }]);

  await Promise.all(
    users.map((user) =>
      getRequest(defaultUrl, [forgeCookie(user)])
        .send(defaultAddressCreateObject)
        .expect(200)
    )
  );
});

it("return 200 when updating address owned by the user", async () => {
  await getDefaultRequest().send(defaultAddressCreateObject).expect(200);
  const userAddress = await Address.findByPk(defaultAddress.id, { raw: true });
  expect(
    omit(userAddress, ["id", "createdAt", "updatedAt", "subdistrictId"])
  ).toEqual(defaultAddressCreateObject);

  await getRequest(getUrl(defaultShopAddressId), defaultCookie())
    .send(defaultAddressCreateObject)
    .expect(200);
  const shopAddress = await Address.findByPk(defaultShopAddressId, {
    raw: true,
  });
  expect(
    omit(shopAddress, ["id", "createdAt", "updatedAt", "subdistrictId"])
  ).toEqual(defaultAddressCreateObject);
});

it("return address with required schema", async () => {
  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(200)
    .expect(({ body }) => {
      console.log(body);
      const { value, error } = addressOutputSchema.validate(body);
      expect(error).toBe(undefined);
    });
});
