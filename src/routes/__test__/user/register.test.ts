import { forgeCookie } from "../../../test/forgeCookie";
import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import bcrypt from "bcrypt";

const defaultCookie = () => [
  forgeCookie(
    {
      id: "3ad3bf2c-6a47-4ce3-ba64-afed197160e0",
    },
    process.env.JWT_SECRET!,
    "jwt"
  ),
];

// Define test data

const userEmpty = async (): Promise<boolean> => {
  const user = await User.findOne();
  return user ? false : true;
};

it("should return 400 if any required property is missing", async () => {
  const missingEmail = {
    name: "Test User",
    password: "password123",
  };

  const missingName = {
    email: "test@example.com",
    password: "password123",
  };

  const missingPassword = {
    email: "test@example.com",
    name: "Test User",
  };

  const missingNamePassword = {
    email: "test@example.com",
  };

  const missingEmailPassword = {
    name: "Tommy",
  };

  const missingEmailName = {
    password: "password123",
  };

  const emptyObject = {};

  await request(app).post("/api/user/register").send(missingEmail).expect(400);
  await request(app).post("/api/user/register").send(missingName).expect(400);
  await request(app)
    .post("/api/user/register")
    .send(missingPassword)
    .expect(400);

  await request(app)
    .post("/api/user/register")
    .send(missingNamePassword)
    .expect(400);
  await request(app)
    .post("/api/user/register")
    .send(missingEmailName)
    .expect(400);
  await request(app)
    .post("/api/user/register")
    .send(missingEmailPassword)
    .expect(400);

  await request(app).post("/api/user/register").send(emptyObject).expect(400);

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if any property is empty", async () => {
  const emptygEmail = {
    email: "",
    name: "Test User",
    password: "password123",
  };

  const emptyName = {
    email: "test@example.com",
    name: "",
    password: "password123",
  };

  const emptyPassword = {
    email: "test@example.com",
    name: "Test User",
    password: "",
  };

  await request(app).post("/api/user/register").send(emptygEmail).expect(400);
  await request(app).post("/api/user/register").send(emptyName).expect(400);
  await request(app).post("/api/user/register").send(emptyPassword).expect(400);

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if password length is invalid", async () => {
  const shortPasswordUserData = {
    email: "test@example.com",
    name: "Test User",
    password: "123", // Password less than 8 characters
  };

  const longPasswordUserData = {
    email: "test@example.com",
    name: "Test User",
    password: "a".repeat(91), // Password more than 90 characters
  };

  await request(app)
    .post("/api/user/register")
    .send(shortPasswordUserData)
    .expect(400);

  await request(app)
    .post("/api/user/register")
    .send(longPasswordUserData)
    .expect(400);

  expect(await userEmpty()).toBe(true);
});

it("should return 400 if email is invalid", async () => {
  const invalidTLD = {
    email: "invalid@mistake",
    name: "Test User",
    password: "password123",
  };
  const noAt = {
    email: "invalidmistake.com",
    name: "Test User",
    password: "password123",
  };
  const noIdentifier = {
    email: "@mistake.com",
    name: "Test User",
    password: "password123",
  };
  const invalidCharacter = {
    email: "inval/id@mis?take.com",
    name: "Test User",
    password: "password123",
  };

  await request(app).post("/api/user/register").send(invalidTLD).expect(400);
  await request(app).post("/api/user/register").send(noAt).expect(400);
  await request(app).post("/api/user/register").send(noIdentifier).expect(400);
  await request(app)
    .post("/api/user/register")
    .send(invalidCharacter)
    .expect(400);
});

it("should return 409 if email already exists", async () => {
  const validUserData = {
    email: "test@example.com",
    name: "Test User",
    hash: await bcrypt.hash("password123", 10),
  };

  const anotherRegisterData = {
    email: "test@example.com",
    name: "Billy",
    password: "blue roast is good",
  };

  // Create a user with the same email in the database
  await User.create(validUserData);
  expect(await userEmpty()).toBe(false);
  await request(app)
    .post("/api/user/register")
    .send(anotherRegisterData)
    .expect(409);
});

it("should return 200 if data is correct and email is not in the database", async () => {
  const minimumLengthPasswordUser = {
    email: "tacosBelly@gmail.com",
    name: "Taco Bell",
    password: "blue roe", //8 character
  };

  const maximumLengthPasswordUser = {
    email: "PizzaBrain@gmail.com",
    name: "Pizza gobbler",
    password: "abcde".repeat(18), //90 character
  };

  const anotherOne = {
    email: "BillyKid@gmail.com",
    name: "Prancer Billy",
    password: "de9UEnvjdU92",
  };
  await request(app)
    .post("/api/user/register")
    .send(minimumLengthPasswordUser)
    .expect(200);
  await request(app)
    .post("/api/user/register")
    .send(maximumLengthPasswordUser)
    .expect(200);
  await request(app).post("/api/user/register").send(anotherOne).expect(200);

  const users = await User.findAll();

  expect(users).toHaveLength(3);
});
