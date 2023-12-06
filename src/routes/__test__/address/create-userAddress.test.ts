import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createAddress,
  createAddressData,
} from "../../../test/helpers/address/addressHelper";
import { AddressCreationAttribute } from "../../../models/address";
import {
  defaultAddressCreateObject,
  invalidAddressValues,
} from "../../../test/helpers/address/addressData";
import { AddressCreateType } from "../../../types/addressType";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import User from "../../../models/User";
import { defaultUser } from "../../../test/helpers/user/userData";
import { pick } from "lodash";
import validationTest from "../../../test/helpers/validationTest.test";
const url = "/api/address/user";
const method = "post";

const getDefaultRequest = () =>
  request(app).post(url).set("Cookie", defaultCookie());

beforeEach(async () => {
  await createDefaultUser();
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
  const user = await User.findByPk(defaultUser.id!);
  await createAddress(10, user!);
  await getDefaultRequest().send(defaultAddressCreateObject).expect(409);
});

it("successfuly create new address for user", async () => {
  const user = await User.findByPk(defaultUser.id!);
  await createAddress(5, user!);
  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(201)
    .expect(({ body }: { body: AddressCreationAttribute }) => {
      expect(
        pick(body, ["latitude", "longitude", "postCode", "detail"])
      ).toEqual(defaultAddressCreateObject);
    });

  const addresses = await user?.$get("addresses");
  expect(addresses).toHaveLength(6);
});

it("added created address id to selected address if there was no address before", async () => {
  const user = await User.findByPk(defaultUser.id!);
  const { body }: { body: AddressCreationAttribute } = await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(201);
  await user?.reload();
  expect(user?.selectedAddressId).toBeTruthy();
  expect(body?.id).toBeTruthy();
  expect(user?.selectedAddressId).toEqual(body?.id);
});
