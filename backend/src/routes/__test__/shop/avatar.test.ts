import request from "supertest";
import app from "../../../app";
import { defaultCookie } from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import imageInputTests from "../../../test/imageInputTests.test";
import path from "path";
import Shop from "../../../models/Shop";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";
import { printedExpect } from "../../../test/helpers/assertionHelper";

const url = "/api/shop/avatar";
const method = "post";
const getRequest = () => request(app).post(url).set("Cookie", defaultCookie());
const getImagePath = (fileName: string) =>
  path.resolve(__dirname, "..", "..", "..", "test", "testImage", fileName);

const defaultRequest = () =>
  getRequest().attach("images", getImagePath("350kb.webp"));

let defaultShop: Shop;

beforeEach(async () => {
  [defaultShop] = await createDefaultShop();
});

describe("passes auth test", () => {
  authenticationTests(app, url, method);
});

describe("passes image test", () => {
  imageInputTests(app, url, method, defaultCookie(), 1, "images", {});
});

it("return 404 when user has no shop", async () => {
  await defaultShop.destroy();
  await defaultRequest().expect(printedExpect(404));
});

it("return 400 when there's no image", async () => {
  await getRequest().send().expect(400);
});

it("return 200 and changed profile picture", async () => {
  await defaultRequest().expect(printedExpect(200));
  await defaultShop.reload();
  expect(defaultShop.avatar).toBeTruthy();
});
