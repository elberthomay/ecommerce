import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createAddress,
  createAddressData,
} from "../../../test/helpers/address/addressHelper";
import { AddressCreationAttribute } from "../../../models/Address";
import {
  defaultAddressCreateObject,
  invalidAddressValues,
} from "../../../test/helpers/address/addressData";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import User from "../../../models/User";
import { defaultUser } from "../../../test/helpers/user/userData";
import { omit, pick } from "lodash";
import validationTest from "../../../test/helpers/validationTest.test";
import {
  addressCreateSchema,
  addressOutputSchema,
} from "@elycommerce/common";
import { z } from "zod";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";
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
  await validationTest<z.input<typeof addressCreateSchema>>(
    getDefaultRequest,
    defaultAddressCreateObject,
    invalidAddressValues
  );
  //validation error when latitude xor longitude is missing, or detail is missing
  await getDefaultRequest()
    .send({ ...defaultAddressCreateObject, latitude: undefined })
    .expect(printedExpect(400));
  await getDefaultRequest()
    .send({ ...defaultAddressCreateObject, longitude: undefined })
    .expect(printedExpect(400));
  await getDefaultRequest()
    .send({ ...defaultAddressCreateObject, detail: undefined })
    .expect(printedExpect(400));
});

it("return 409 if address exceed limit", async () => {
  const user = await User.findByPk(defaultUser.id!);
  await createAddress(10, user!);
  await getDefaultRequest().send(defaultAddressCreateObject).expect(409);
});

it("successfuly create new address without coordinates", async () => {
  await getDefaultRequest()
    .send({
      ...defaultAddressCreateObject,
      latitude: undefined,
      longitude: undefined,
    })
    .expect(printedExpect(201));
});

it("successfuly create new address for user", async () => {
  const user = await User.findByPk(defaultUser.id!);
  await createAddress(5, user!);
  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(printedExpect(201))
    .expect(({ body }: { body: z.infer<typeof addressOutputSchema> }) => {
      expect(omit(body, ["id", "selected", "subdistrictId"])).toEqual(
        defaultAddressCreateObject
      );
    });

  const addresses = await user?.$get("addresses");
  expect(addresses).toHaveLength(6);
});

it("added created address id to selected address if there was no address before", async () => {
  const user = await User.findByPk(defaultUser.id!);
  const { body }: { body: AddressCreationAttribute } = await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(printedExpect(201));
  await user?.reload();
  expect(user?.selectedAddressId).toBeTruthy();
  expect(body?.id).toBeTruthy();
  expect(user?.selectedAddressId).toEqual(body?.id);
});

it("return address with required schema", async () => {
  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(printedExpect(201))
    .expect(validatedExpect(addressOutputSchema));
});
