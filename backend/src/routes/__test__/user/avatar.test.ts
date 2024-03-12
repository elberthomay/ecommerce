import request from "supertest";
import app from "../../../app";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import imageInputTests from "../../../test/imageInputTests.test";
import User from "../../../models/User";
import path from "path";
const url = "/api/user/avatar";
const method = "post";
const getRequest = () => request(app).post(url).set("Cookie", defaultCookie());
const getImagePath = (fileName: string) =>
  path.resolve(__dirname, "..", "..", "..", "test", "testImage", fileName);

let defaultUser: User;

beforeEach(async () => {
  defaultUser = await createDefaultUser();
});

describe("passes auth test", () => {
  authenticationTests(app, url, method);
});

describe("passes image test", () => {
  imageInputTests(app, url, method, defaultCookie(), 1, "images", {});
});

it("return 400 when there's no image", async () => {
  await getRequest().send().expect(400);
});

it("return 200 and changed profile picture", async () => {
  await getRequest()
    .attach("images", getImagePath("350kb.webp"))
    .expect((res) => {
      if (res.statusCode !== 200) console.error(JSON.stringify(res.body));
    })
    .expect(200);
  await defaultUser.reload();
  expect(defaultUser.avatar).toBeTruthy();
});
