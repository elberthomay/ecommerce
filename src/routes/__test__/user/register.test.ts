import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import { omit } from "lodash";
import { createDefaultUser } from "../../../test/helpers/user/userHelper";
import { defaultRegisterData } from "../../../test/helpers/user/userData";
import {
  emailTest,
  nameTest,
  passwordTest,
  registerPropertyTest,
} from "../../../test/helpers/user/userSuite";

const url = "/api/user/register";

const userEmpty = async (): Promise<boolean> => {
  const user = await User.findOne();
  return user ? false : true;
};

describe("return 400 for validation errors", () => {
  passwordTest(app, url);
  emailTest(app, url);
  nameTest(app, url);
  registerPropertyTest(app, url);
});

it("should return 409 if email already exists", async () => {
  await createDefaultUser();
  await request(app).post(url).send(defaultRegisterData).expect(409);
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
    validBodies.map((body) => request(app).post(url).send(body).expect(201))
  );

  expect(await User.count()).toEqual(5); //root user created in setup.ts
});
