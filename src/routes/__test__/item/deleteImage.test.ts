import app from "../../../app";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import request from "supertest";
import { defaultCookie } from "../../../test/helpers/user/userHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
import { MAX_IMAGE_COUNT } from "../../../var/constants";
import ItemImage from "../../../models/ItemImage";
import authenticationTests from "../../../test/authenticationTests.test";
import { invalidOrderArray } from "../../../test/helpers/itemImage/itemImageData";
import _ from "lodash";

const createUrl = (itemId: string) => `/api/item/${itemId}/images`;
const defaultUrl = createUrl(defaultItem.id!);
const method = "delete";

const defaultImages = [...Array(MAX_IMAGE_COUNT - 2).keys()].map((i) => ({
  itemId: defaultItem.id!,
  imageName: `image${i}.webp`,
  order: i,
}));

beforeEach(async () => {
  await createItem([defaultItem], defaultShop);
  await ItemImage.bulkCreate(defaultImages);
});

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, defaultUrl, method, defaultItem);
});

it("should return 400 with invalid orderArray", async () => {
  await Promise.all(
    invalidOrderArray.map((orderArray) =>
      request(app)
        .delete(defaultUrl)
        .set("Cookie", defaultCookie())
        .type("application/json")
        .send(orderArray)
        .expect(400)
    )
  );
});

it("should not change image when given nonexistent id", async () => {
  await request(app)
    .delete(defaultUrl)
    .set("Cookie", defaultCookie())
    .type("application/json")
    .send([MAX_IMAGE_COUNT - 1])
    .expect(200);
  const images = await ItemImage.findAll({
    where: { itemId: defaultItem.id },
    order: [["order", "ASC"]],
  });
  expect(
    images.map((image) => _.pick(image, ["itemId", "imageName", "order"]))
  ).toEqual(defaultImages);
});

it("should delete 2 image and return 200", async () => {
  const response = await request(app)
    .delete(defaultUrl)
    .set("Cookie", defaultCookie())
    .type("application/json")
    .send([MAX_IMAGE_COUNT - 4, MAX_IMAGE_COUNT - 3])
    .expect(200);

  console.log(response.status);
  console.log(response.body?.errors);
  const images = await ItemImage.findAll({
    where: { itemId: defaultItem.id },
    order: [["order", "ASC"]],
  });
  expect(
    images.map((image) => _.pick(image, ["itemId", "imageName", "order"]))
  ).toEqual(defaultImages.slice(0, MAX_IMAGE_COUNT - 4));
});

it("should not delete image from other item", async () => {
  const [item] = await createItem(1);
  await ItemImage.bulkCreate(
    defaultImages.map((image) => ({ ...image, itemId: item.id }))
  );

  await request(app)
    .delete(defaultUrl)
    .set("Cookie", defaultCookie())
    .type("application/json")
    .send([MAX_IMAGE_COUNT - 4, MAX_IMAGE_COUNT - 3])
    .expect(200);

  const imagesFromOtherItem = await ItemImage.findAll({
    where: { itemId: item.id },
    order: [["order", "ASC"]],
  });
  expect(imagesFromOtherItem).toHaveLength(MAX_IMAGE_COUNT - 2);
});

it("should reorder the remaining images", async () => {
  const deletedOrder = [0, 1, 3];
  await request(app)
    .delete(defaultUrl)
    .set("Cookie", defaultCookie())
    .type("application/json")
    .send(deletedOrder)
    .expect(200);

  const images = await ItemImage.findAll({
    where: { itemId: defaultItem.id },
    order: [["order", "ASC"]],
  });

  //filter and reorder entry
  const filteredImages = defaultImages
    .filter((image) => !_.includes(deletedOrder, image.order))
    .map((image, i) => ({ ...image, order: i }));
  expect(
    images.map((image) => _.pick(image, ["itemId", "imageName", "order"]))
  ).toEqual(filteredImages);
});
