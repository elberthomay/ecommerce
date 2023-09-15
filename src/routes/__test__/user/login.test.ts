import { forgeCookie } from "../../../test/forgeCookie";
import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const defaultUser = {
  id: "3ad3bf2c-6a47-4ce3-ba64-afed197160e0",
  email: "test@example.com",
  name: "Test Name",
  hash: "$2b$10$xAUHKDvjpyGgSOO8HARfZOdQZj7xwd/4hIiTjjBPsYOtvUhsZ6EtO", //password123
};

const defaultCookie = () => [
  forgeCookie(
    {
      id: defaultUser.id,
    },
    process.env.JWT_SECRET!,
    "jwt"
  ),
];

const insertDefaultUser = async () => {
  await User.create(defaultUser);
};

it("should return 400 if any required property is missing", async () => {
  await insertDefaultUser();
  const missingEmail = {
    password: "password123",
  };

  const missingPassword = {
    email: "test@example.com",
  };

  const emptyObject = {};

  await request(app).post("/api/user/login").send(missingEmail).expect(400);
  await request(app).post("/api/user/login").send(missingPassword).expect(400);

  await request(app).post("/api/user/login").send(emptyObject).expect(400);
});

it("should return 400 if any property is empty", async () => {
  const emptygEmail = {
    email: "",
    password: "password123",
  };

  const emptyPassword = {
    email: "test@example.com",
    password: "",
  };

  await request(app).post("/api/user/login").send(emptygEmail).expect(400);
  await request(app).post("/api/user/login").send(emptyPassword).expect(400);
});

it("should return 400 if password length is invalid", async () => {
  const shortPasswordUserData = {
    email: "test@example.com",
    password: "123", // Password less than 8 characters
  };

  const longPasswordUserData = {
    email: "test@example.com",
    password: "a".repeat(91), // Password more than 90 characters
  };

  await request(app)
    .post("/api/user/login")
    .send(shortPasswordUserData)
    .expect(400);

  await request(app)
    .post("/api/user/login")
    .send(longPasswordUserData)
    .expect(400);
});

it("should return 400 if email is invalid", async () => {
  const invalidTLD = {
    email: "invalid@mistake",
    password: "password123",
  };
  const noAt = {
    email: "invalidmistake.com",
    password: "password123",
  };
  const noIdentifier = {
    email: "@mistake.com",
    password: "password123",
  };
  const invalidCharacter = {
    email: "inval/id@mis?take.com",
    password: "password123",
  };

  await request(app).post("/api/user/login").send(invalidTLD).expect(400);
  await request(app).post("/api/user/login").send(noAt).expect(400);
  await request(app).post("/api/user/login").send(noIdentifier).expect(400);
  await request(app).post("/api/user/login").send(invalidCharacter).expect(400);
});

it("should return 401 if account doesn't exist in db", async () => {
  //adding a few account
  await User.create({
    email: "test0@google.com",
    name: "Test Name1",
    hash: await bcrypt.hash("flJ(jB38h82", 10),
  });
  await User.create({
    email: "test1@yahoo.com",
    name: "Test5 Name1",
    hash: await bcrypt.hash("flJ(9khH3782", 10),
  });

  const loginData = {
    email: "test@example.com",
    password: "password123",
  };

  await request(app).post("/api/user/login").send(loginData).expect(401);
});

it("should return 401 if password doesn't match", async () => {
  //adding a few account
  await User.create({
    email: "test0@google.com",
    name: "Test Name1",
    hash: await bcrypt.hash("flJ(jB38h82", 10),
  });
  await User.create({
    email: "test1@yahoo.com",
    name: "Test5 Name1",
    hash: await bcrypt.hash("flJ(9khH3782", 10),
  });

  const loginData = {
    email: "test0@google.com",
    password: "password123",
  };

  await request(app).post("/api/user/login").send(loginData).expect(401);
});

it("should return 200 if email and password match and correct expiration period", async () => {
  //adding a few account
  const user = await User.create({
    email: "test0@google.com",
    name: "Test Name1",
    hash: await bcrypt.hash("flJ(jB38h82", 10),
  });
  await User.create({
    email: "test1@yahoo.com",
    name: "Test5 Name1",
    hash: await bcrypt.hash("flJ(9khH3782", 10),
  });

  const loginData = {
    email: "test0@google.com",
    password: "flJ(jB38h82",
  };

  //remember me false
  let response = await request(app)
    .post("/api/user/login")
    .send({ ...loginData, rememberMe: false })
    .expect(200);
  expect(response.headers["set-cookie"]).toBeDefined();
  // Parse the cookie strings (assuming there's only one cookie)
  let cookieString: string = response.headers["set-cookie"][0];
  let cookies = cookieString.split(";").map((cookie) => cookie.trim());

  //   // Check the cookies for the expected values
  expect(
    cookies.some((cookie) => {
      // Parse the cookie string further if needed
      const [cookieName, cookieValue] = cookie.split("=");

      // Check if the cookie name and value match your expectations
      if (cookieName === "jwt") {
        expect(cookieValue).toBe(
          jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "86400000",
          })
        );
        return true;
      } else return false;
    })
  ).toBe(true);

  //remember me true
  response = await request(app)
    .post("/api/user/login")
    .send({ ...loginData, rememberMe: true })
    .expect(200);
  expect(response.headers["set-cookie"]).toBeDefined();
  // Parse the cookie strings (assuming there's only one cookie)
  cookieString = response.headers["set-cookie"][0];
  cookies = cookieString.split(";").map((cookie) => cookie.trim());

  //   // Check the cookies for the expected values
  expect(
    cookies.some((cookie) => {
      // Parse the cookie string further if needed
      const [cookieName, cookieValue] = cookie.split("=");

      // Check if the cookie name and value match your expectations
      if (cookieName === "jwt") {
        expect(cookieValue).toBe(
          jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "2592000000",
          })
        );
        return true;
      } else return false;
    })
  ).toBe(true);
});
