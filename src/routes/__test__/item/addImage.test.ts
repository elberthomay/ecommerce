import path from "path";
import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import imageInputTests from "../../../test/imageInputTests.test";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { MAX_IMAGE_COUNT } from "../../../var/constants";
import Item from "../../../models/Item";
import ItemImage from "../../../models/ItemImage";
import { defaultShop } from "../../../test/helpers/shopHelper";
import Shop from "../../../models/Shop";

const createUrl = (itemId: string) => `/api/item/${itemId}/images`;
const defaultUrl = createUrl(defaultItem.id!);
const method = "post";
const defaultRequest = request(app)
  .post(defaultUrl)
  .set("Cookie", defaultCookie())
  .type("multipart/form-data");

const getImagePath = (fileName: string) =>
  path.resolve(__dirname, "..", "..", "..", "test", "testImage", fileName);

//create default item to add image to
beforeEach(async () => {
  await createItem([defaultItem], defaultShop);
});

//work for now as authentication check is always the first middleware but should be modified
describe("should return 401 with failed authentication", () => {
  authenticationTests(app, defaultUrl, "post", defaultItem);
});

describe("should return 400 for image errors", () => {
  imageInputTests(
    app,
    defaultUrl,
    method,
    defaultCookie(),
    MAX_IMAGE_COUNT,
    "images",
    undefined
  );
});

it("return 404 if item does not exist", async () => {
  const item = await Item.findByPk(defaultItem.id);
  await item?.destroy();

  await defaultRequest.attach("images", getImagePath("350kb.webp")).expect(404);
});

it("return 403 if accessed not by the creator", async () => {
  const {
    users: [user],
  } = await createUser(1);
  await defaultRequest
    .set("Cookie", [forgeCookie(user)])
    .attach("images", getImagePath("350kb.webp"))
    .expect(403);
});

it("return 409 when trying to add image above limit", async () => {
  const images = [...Array(MAX_IMAGE_COUNT - 2).keys()].map((i) => ({
    itemId: defaultItem.id!,
    imageName: `image${i}.webp`,
    order: i,
  }));
  const imagesObject = await ItemImage.bulkCreate(images);

  let requestObject = defaultRequest;
  for (let i = 0; i < 3; i++)
    requestObject = requestObject.attach("images", getImagePath("350kb.webp"));

  await requestObject.expect(409);
});

it("return 200 if accessed by admin", async () => {
  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);
  await defaultRequest
    .set("Cookie", [forgeCookie(newAdmin)])
    .attach("images", getImagePath("350kb.webp"))
    .expect(200);
});

it("return 200 when adding no image", async () => {
  await defaultRequest.expect(200);
});

it("return 200 and successfuly added image", async () => {
  let requestObject = defaultRequest;
  for (let i = 0; i < MAX_IMAGE_COUNT; i++)
    requestObject = requestObject.attach("images", getImagePath("350kb.webp"));

  await requestObject.expect(200);

  const images = await ItemImage.findAll({
    where: { itemId: defaultItem.id! },
  });
  expect(images).toHaveLength(MAX_IMAGE_COUNT);
});
