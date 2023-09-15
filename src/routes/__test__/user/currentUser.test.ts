import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import { forgeCookie } from "../../../test/forgeCookie";

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

it("should return empty object if not logged in", async () => {
  const response = await request(app).get("/api/user").send().expect(200);

  expect(response.body).toEqual({});
});

it("should return user information if user is logged in", async () => {
  await insertDefaultUser();
  const response = await request(app)
    .get("/api/user")
    .set("Cookie", defaultCookie())
    .send();
  expect(response.body["id"]).toEqual(defaultUser.id);
});
