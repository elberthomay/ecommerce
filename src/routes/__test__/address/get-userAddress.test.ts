import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { createAddress } from "../../../test/helpers/address/addressHelper";

const url = "/api/address/user";
const method = "get";
const getDefaultRequest = () =>
  request(app).get(url).set("Cookie", defaultCookie());

describe("passes authentication tests", () => {
  authenticationTests(app, url, method);
});

it("return [] when there's no address in user's account", async () => {
  await createDefaultUser();
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
  const defaultUser = await createDefaultUser();
  await createAddress(5, anotherUser);
  await createAddress(5, defaultUser);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toHaveLength(5));
});
