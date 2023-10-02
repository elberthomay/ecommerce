import {
  createDefaultUser,
  createUser,
  defaultUser,
  forgeCookie,
  parseResponseCookie,
  tokenEqualityTest,
} from "../../../test/helpers/user/userHelper";
import request, { Response } from "supertest";
import app from "../../../app";
import _ from "lodash";
import {
  invalidEmails,
  invalidName,
  invalidPasswords,
} from "../../../test/helpers/user/userData";
import User from "../../../models/User";

const url = "/api/user/login";

const defaultLoginData = _.pick(defaultUser, ["email", "password"]);

it("should return 400 if any required property is missing", async () => {
  const invalidLoginDatas = [
    _.omit(defaultLoginData, "email"), //no email
    _.omit(defaultLoginData, "password"), //no password
    {}, //no anything
  ];

  await Promise.all(
    invalidLoginDatas.map((invalidLoginData) =>
      request(app).post(url).send(invalidLoginData).expect(400)
    )
  );
});

it("should return 400 if any property is empty", async () => {
  const invalidLoginDatas = [
    { ...defaultLoginData, email: "" }, //empty email
    { ...defaultLoginData, password: "" }, //empty password
  ];

  await Promise.all(
    invalidLoginDatas.map((invalidLoginData) =>
      request(app).post(url).send(invalidLoginData).expect(400)
    )
  );
});

it("should return 400 with invalid property", async () => {
  const invalidLoginDatas = [
    { ...defaultLoginData, invalid: "property" }, // an invalid property
  ];

  await Promise.all(
    invalidLoginDatas.map((invalidLoginData) =>
      request(app).post(url).send(invalidLoginData).expect(400)
    )
  );
});

it("should return 400 if password is invalid", async () => {
  const invalidLoginDatas = invalidPasswords.map((password) => ({
    ...defaultLoginData,
    password,
  }));

  await Promise.all(
    invalidLoginDatas.map((loginData) =>
      request(app).post(url).send(loginData).expect(400)
    )
  );
});

it("should return 400 if email is invalid", async () => {
  const invalidLoginDatas = invalidEmails.map((email) => ({
    ...defaultLoginData,
    email,
  }));

  await Promise.all(
    invalidLoginDatas.map((loginData) =>
      request(app).post(url).send(loginData).expect(400)
    )
  );
});

it("should return 400 if name is invalid", async () => {
  const invalidLoginDatas = invalidName.map((name) => ({
    ...defaultLoginData,
    name,
  }));

  await Promise.all(
    invalidLoginDatas.map((loginData) =>
      request(app).post(url).send(loginData).expect(400)
    )
  );
});

it("should return 401 if account doesn't exist in db", async () => {
  const users = await createUser(3);

  await request(app).post(url).send(defaultLoginData).expect(401);
});

it("should return 401 if password doesn't match", async () => {
  const users = await createUser(3);
  const loginData = {
    email: users.userDatas[0].email,
    password: users.userDatas[0].password + "1",
  };

  await request(app).post(url).send(loginData).expect(401);
});

it("should return 200 if email and password match and correct expiration period", async () => {
  //adding a few account
  const users = await createUser([defaultUser, {}, {}]); // create 3 user with one of them default user

  //remember me false
  await request(app)
    .post(url)
    .send({ ...defaultLoginData, rememberMe: false })
    .expect(200)
    .expect(
      tokenEqualityTest(
        forgeCookie(defaultUser, {
          expiresIn: "86400000",
        }).split("=")[1]
      )
    );

  //remember me true
  await request(app)
    .post(url)
    .send({ ...defaultLoginData, rememberMe: true })
    .expect(200)
    .expect(
      tokenEqualityTest(
        forgeCookie(defaultUser, {
          expiresIn: "2592000000",
        }).split("=")[1]
      )
    );
});
