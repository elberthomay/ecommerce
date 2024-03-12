import request from "supertest";
import { omit } from "lodash";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import User from "../../../models/User";
import { addressOutputArraySchema } from "../../../schemas/addressSchema";
import { defaultAddressCreateObject } from "../../../test/helpers/address/addressData";

const url = "/api/address/user";
const method = "get";
let defaultUser: User;
const getDefaultRequest = () =>
  request(app).get(url).set("Cookie", defaultCookie());

describe("passes authentication tests", () => {
  authenticationTests(app, url, method);
});

beforeEach(async () => {
  defaultUser = await createDefaultUser();
});

it("return [] when there's no address in user's account", async () => {
  const {
    users: [anotherUser],
  } = await createUser(1);
  await createAddress(5, anotherUser);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toEqual([]));
});

it("return 5 addresses when there's 5 address in user's account", async () => {
  const {
    users: [anotherUser],
  } = await createUser(1);
  await createAddress(5, anotherUser);
  await createAddress(5, defaultUser);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toHaveLength(5));
});

it("return selected address first, followed by the rest ordered descending by last updated", async () => {
  const addresses = await createAddress(5, defaultUser);
  await defaultUser.update({ selectedAddressId: addresses[4].id });
  //wait 1 second
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addresses[3].update({ postCode: "94838" });
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body[0].id).toBe(defaultUser.selectedAddressId);
      expect(body[1].id).toBe(addresses[3].id);
    });
});

it("return address with required schema", async () => {
  await createAddress(5, defaultUser);
  await createAddress(
    [{ ...omit(defaultAddressCreateObject, ["longitude", "latitude"]) }],
    defaultUser
  );
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => {
      const validationResult = addressOutputArraySchema.safeParse(body);
      expect(validationResult.success).toBe(true);
    });
});
