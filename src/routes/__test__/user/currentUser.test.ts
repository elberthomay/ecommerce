import request from "supertest";
import app from "../../../app";
import User from "../../../models/User";
import { defaultCookie, defaultUser } from "../../../test/forgeCookie";

const url = "/api/user";

const insertDefaultUser = async () => {
  await User.create(defaultUser);
};

it("should return empty object if not logged in", async () => {
  const response = await request(app).get(url).send().expect(200);

  expect(response.body).toEqual({});
});

it("should return user information if user is logged in", async () => {
  await insertDefaultUser();
  const response = await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send();
  expect(response.body["id"]).toEqual(defaultUser.id);
});
