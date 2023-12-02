import _ from "lodash";
import app from "../../../app";
import Item from "../../../models/Item";
import ItemImage from "../../../models/ItemImage";
import authenticationTests from "../../../test/authenticationTests.test";
import { invalidUuid } from "../../../test/helpers/commonData";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { invalidOrderArray } from "../../../test/helpers/itemImage/itemImageData";
import { defaultShop } from "../../../test/helpers/shopHelper";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { MAX_IMAGE_COUNT } from "../../../var/constants";
import request from "supertest";
import { shuffle } from "lodash";

const createUrl = (itemId: string) => `/api/item/${itemId}/images`;
const defaultUrl = createUrl(defaultItem.id!);
const method = "patch";
const defaultImageCount = MAX_IMAGE_COUNT - 2;

const createItemImageValue = (itemId: string) =>
  [...Array(defaultImageCount).keys()].map((i) => ({
    itemId,
    imageName: `image${i}.webp`,
    order: i,
  }));

const defaultImages = createItemImageValue(defaultItem.id!);

const fetchImagesFromItemId = async (itemId: string) =>
  (
    await ItemImage.findAll({
      where: { itemId },
      order: [["order", "ASC"]],
    })
  ).map((image) => ({
    itemId: defaultItem.id,
    imageName: image.imageName,
    order: image.order,
  }));

const fetchDefaultImages = async () =>
  await fetchImagesFromItemId(defaultItem.id!);

const createRequest = (url: string, cookies: string[]) =>
  request(app).patch(url).set("Cookie", cookies);

const getDefaultRequest = () => createRequest(defaultUrl, defaultCookie());

const defaultOrderArray = Array.from(
  { length: defaultImageCount },
  (v, i) => i
);

beforeEach(async () => {
  await createItem([defaultItem], defaultShop);
  await ItemImage.bulkCreate(defaultImages);
});

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, defaultUrl, method, defaultItem);
});

it("should return 400 validation error when accessed with invalid itemId", async () => {
  await Promise.all(
    invalidUuid.map((invalidId) =>
      createRequest(createUrl(invalidId), defaultCookie())
        .send(defaultOrderArray)
        .expect(400)
    )
  );
});

it("should return 400 with invalid order array", async () => {
  await Promise.all(
    invalidOrderArray.map((array) =>
      getDefaultRequest().send(array).expect(400)
    )
  );
});

it("should return 404 when user item does not exist", async () => {
  const item = await Item.findByPk(defaultItem.id);
  await item?.destroy();

  await getDefaultRequest().send(defaultOrderArray).expect(404);
});

it("should return 200 when accessed by owner or admin", async () => {
  const {
    users: [root, admin],
  } = await createUser([{ privilege: 0 }, { privilege: 1 }]);
  const result = await createRequest(defaultUrl, defaultCookie())
    .send(defaultOrderArray)
    .expect(200);
  await createRequest(defaultUrl, [forgeCookie(root)])
    .send(defaultOrderArray)
    .expect(200);
  await createRequest(defaultUrl, [forgeCookie(admin)])
    .send(defaultOrderArray)
    .expect(200);
});

it("should return 400 if order array has improper length or duplicate number", async () => {
  const invalidUpdateOrders = [
    defaultOrderArray.slice(0, defaultImageCount - 1),
    defaultOrderArray.concat([9], [0, 0, ...defaultOrderArray.slice(2)]),
  ];
  await Promise.all(
    invalidUpdateOrders.map((updateOrder) =>
      getDefaultRequest()
        .send(updateOrder)
        .expect(400)
        .expect(({ body }) => body.message === "invalid order array")
    )
  );
});

it("should reorder image array", async () => {
  const initialImages = await fetchDefaultImages();

  const updateOrders = Array.from({ length: 3 }, () =>
    shuffle(defaultOrderArray)
  );

  //find result by changing order and sorting array
  let resultImages = initialImages;
  updateOrders.forEach(
    (order) =>
      (resultImages = resultImages
        .map((image, i) => ({ ...image, order: order[i] }))
        .sort((a, b) => a.order - b.order))
  );

  for (const order of updateOrders) {
    await getDefaultRequest().send(order).expect(200);
  }

  const changedImages = await fetchDefaultImages();

  expect(changedImages).toEqual(resultImages);
});

it("it should not reorder image with the same name from other item", async () => {
  const [anotherItem] = await createItem(1);
  await ItemImage.bulkCreate(createItemImageValue(anotherItem.id));

  const initialImages = fetchImagesFromItemId(anotherItem.id);

  const updateOrders = Array.from({ length: 3 }, () =>
    shuffle(defaultOrderArray)
  );

  for (const order of updateOrders) {
    await getDefaultRequest().send(order).expect(200);
  }

  const changedImages = fetchImagesFromItemId(anotherItem.id);

  expect(changedImages).toEqual(initialImages);
});
