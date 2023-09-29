import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import bcrypt from "bcrypt";
import _ from "lodash";
import {
  createDefaultUser,
  defaultUser,
} from "../../../test/helpers/user/userHelper";
import {
  invalidEmails,
  invalidName,
  invalidPasswords,
} from "../../../test/helpers/user/userData";

const url = "/api/user/register";

const defaultRegisterData = _.pick(defaultUser, ["email", "name", "password"]);

const userEmpty = async (): Promise<boolean> => {
  const user = await User.findOne();
  return user ? false : true;
};

it("should return 400 if any required property is missing", async () => {
  const invalidBodies = [
    _.omit(defaultRegisterData, "email"), //missing email
    _.omit(defaultRegisterData, "name"), //missing name
    _.omit(defaultRegisterData, "password"), //missing password
  ];

  await Promise.all(
    invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
  );

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if any property is empty", async () => {
  const invalidBodies = [
    { ...defaultRegisterData, email: "" }, //empty email
    { ...defaultRegisterData, name: "" }, //empty name
    { ...defaultRegisterData, password: "" }, //empty password
  ];

  await Promise.all(
    invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
  );

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if password length is invalid", async () => {
  const invalidBodies = invalidPasswords.map((password) => ({
    ...defaultRegisterData,
    password,
  }));

  await Promise.all(
    invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
  );

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if email is invalid", async () => {
  const invalidBodies = invalidEmails.map((email) => ({
    ...defaultRegisterData,
    email,
  }));

  await Promise.all(
    invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
  );

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if name is invalid", async () => {
  const invalidRegisterDatas = invalidName.map((name) => ({
    ...defaultRegisterData,
    name,
  }));

  await Promise.all(
    invalidRegisterDatas.map((registerData) =>
      request(app).post(url).send(registerData).expect(400)
    )
  );
});

it("should return 409 if email already exists", async () => {
  await createDefaultUser();
  await request(app).post(url).send(defaultRegisterData).expect(409);
});

it("should return 200 if data is correct and email is not in the database", async () => {
  const validBodies = [
    {
      email: "tacosBelly@gmail.com",
      name: "Taco Bell",
      password: "blue roe", //8 character
    },
    {
      email: "PizzaBrain@gmail.com",
      name: "Pizza gobbler",
      password: "abcde".repeat(18), //90 character
    },
    {
      email: "BillyKid@gmail.com",
      name: "Prancer Billy",
      password: "de9UEnvjdU92",
    },
    defaultRegisterData,
  ];
  await Promise.all(
    validBodies.map((body) => request(app).post(url).send(body).expect(200))
  );

  expect(await User.count()).toEqual(4);
});
