import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import { createDefaultUser } from "../../../test/helpers/user/userHelper";
import {
  defaultRegisterData,
  invalidUserValue,
} from "../../../test/helpers/user/userData";
import validationTest from "../../../test/helpers/validationTest.test";

const url = "/api/user/register";
const getRequest = () => request(app).post(url);

const userEmpty = async (): Promise<boolean> => {
  const user = await User.findOne();
  return user ? false : true;
};

it("return 400 for validation errors", async () => {
  await validationTest(getRequest, defaultRegisterData, invalidUserValue);
});

it("should return 409 if email already exists", async () => {
  await createDefaultUser();
  await getRequest().send(defaultRegisterData).expect(409);
});

it("should return 201 if data is correct and email is not in the database", async () => {
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
    validBodies.map((body) => getRequest().send(body).expect(201))
  );

  expect(await User.count()).toEqual(5); //root user created in setup.ts
});
