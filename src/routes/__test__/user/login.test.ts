import {
  createUser,
  forgeCookie,
  tokenEqualityTest,
} from "../../../test/helpers/user/userHelper";
import {
  defaultUser,
  invalidUserValue,
} from "../../../test/helpers/user/userData";
import request from "supertest";
import app from "../../../app";
import _, { pick } from "lodash";
import validationTest from "../../../test/helpers/validationTest.test";

const url = "/api/user/login";
const getRequest = () => request(app).post(url);

const defaultLoginData = _.pick(defaultUser, ["email", "password"]);

it("return 400 for validation errors", async () => {
  await validationTest(
    getRequest,
    defaultLoginData,
    pick(invalidUserValue, ["email", "password"])
  );
});

it("should return 400 with invalid property", async () => {
  const invalidLoginDatas = [
    { ...defaultLoginData, invalid: "property" }, // an invalid property
  ];

  await Promise.all(
    invalidLoginDatas.map((invalidLoginData) =>
      getRequest().send(invalidLoginData).expect(400)
    )
  );
});

it("should return 401 if account doesn't exist in db", async () => {
  const users = await createUser(3);

  await getRequest().send(defaultLoginData).expect(401);
});

it("should return 401 if password doesn't match", async () => {
  const users = await createUser(3);
  const loginData = {
    email: users.userDatas[0].email,
    password: users.userDatas[0].password + "1",
  };

  await getRequest().send(loginData).expect(401);
});

it("should return 200 if email and password match and correct expiration period", async () => {
  //adding a few account
  const users = await createUser([defaultUser, {}, {}]); // create 3 user with one of them default user

  //remember me false
  await getRequest()
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
  await getRequest()
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
