import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import { faker } from "@faker-js/faker";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import User from "../../../models/User";
import validationTest from "../../../test/helpers/validationTest.test";
import { invalidUserValue } from "../../../test/helpers/user/userData";
import { omit, pick } from "lodash";
import { CurrentUserOutputType } from "../../../types/userTypes";
import { currentUserOutputSchema } from "../../../schemas.ts/userSchema";

const url = "/api/user/";
const method = "patch";
const getRequest = (cookie: string[]) =>
  request(app).patch(url).set("Cookie", cookie);
const defaultRequest = () =>
  getRequest(defaultCookie()).send(defaultUpdateData);
let defaultUser: User;

const defaultUpdateData = { name: faker.person.fullName() };

beforeEach(async () => {
  defaultUser = await createDefaultUser();
});

describe("passes authentication test", () => {
  authenticationTests(app, url, method);
});

it("return 400 with validation error", async () => {
  const invalidName = { name: invalidUserValue.name };
  await validationTest(() => getRequest(defaultCookie()), {}, invalidName);
});

it("doesnt change other user's data", async () => {
  const {
    users: [user],
  } = await createUser(1);
  await defaultRequest().expect(200);
  const oldName = user.name;
  await user.reload();
  expect(user.name).toBe(oldName);
});

it("doesn't change other field", async () => {
  const rawDefaultUser = await User.findByPk(defaultUser.id, { raw: true });
  const oldUnupdated = omit(rawDefaultUser, Object.keys(defaultUpdateData));
  await defaultRequest().expect(200);
  const rawUpdatedUser = await User.findByPk(defaultUser.id, { raw: true });
  const newUnupdated = omit(rawUpdatedUser, Object.keys(defaultUpdateData));
  expect(oldUnupdated).toEqual(newUnupdated);
});

it("updated user data", async () => {
  await defaultRequest().expect(200);
  const rawDefaultUser = await User.findByPk(defaultUser.id, { raw: true });
  const updatedfields = pick(rawDefaultUser, Object.keys(defaultUpdateData));
  expect(updatedfields).toEqual(defaultUpdateData);
});

it("returned data that match currentUserOutputSchema", async () => {
  await defaultRequest()
    .expect(200)
    .expect(({ body }: { body: CurrentUserOutputType }) => {
      const { value, error } = currentUserOutputSchema.validate(body);
      console.log(value);
      expect(error).toBeUndefined();
    });
});
