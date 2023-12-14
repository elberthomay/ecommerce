import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import { createUser, forgeCookie } from "../../../test/helpers/user/userHelper";
import {
  defaultRegisterData,
  defaultRootUser,
  invalidUserValue,
} from "../../../test/helpers/user/userData";
import User from "../../../models/User";
import validationTest from "../../../test/helpers/validationTest.test";

const url = "/api/user/createAdmin";

const method = "post";

const getRequest = () => request(app).post(url);

describe("succeed authentication", () => {
  authenticationTests(app, url, method, defaultRegisterData);
});

it("return 400 for validation errors", async () => {
  await validationTest(getRequest, defaultRegisterData, invalidUserValue);
});

it("return 403 if not a root user", async () => {
  const {
    users: [newUser],
  } = await createUser(1);
  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);
  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(newUser))
    .send(defaultRegisterData)
    .expect(403);
  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(newAdmin))
    .send(defaultRegisterData)
    .expect(403);
});

it("return 201 with status success and email", async () => {
  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send(defaultRegisterData)
    .expect(201)
    .expect(({ body }) => {
      expect((body as any)?.email).toEqual(defaultRegisterData.email);
    });

  const newAdmin = await User.findOne({
    where: { email: defaultRegisterData.email },
  });
  expect(newAdmin).toBeDefined();
  expect(newAdmin?.privilege).toEqual(1);
});
