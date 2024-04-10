import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import Item from "../../../models/Item";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { createShop, defaultShop } from "../../../test/helpers/shop/shopHelper";
import { invalidUuid } from "../../../test/helpers/commonData";
import _ from "lodash";
import { defaultUser } from "../../../test/helpers/user/userData";
import { z } from "zod";
import {
  MAX_IMAGE_COUNT,
  itemDetailsOutputSchema,
  itemUpdateSchema,
} from "@elycommerce/common";
import { pick } from "lodash";
import path from "path";
import imageInputTests from "../../../test/imageInputTests.test";
import ItemImage from "../../../models/ItemImage";
import { printedExpect } from "../../../test/helpers/assertionHelper";

const url = "/api/item/";

const getImagePath = (fileName: string) =>
  path.resolve(__dirname, "..", "..", "..", "test", "testImage", fileName);

const objectClipper = (item: any, shape: Record<string, any>) =>
  pick(item, Object.keys(shape));

const getRequest = (
  itemId: string,
  cookie: string[],
  body: any,
  imageNames?: string[]
) => {
  let requestObject = request(app)
    .patch(url + itemId)
    .set("Cookie", cookie);
  if (imageNames !== undefined) {
    requestObject = requestObject
      .type("multipart/form-data")
      .field("body", JSON.stringify(body));
    for (const imageName of imageNames)
      requestObject = requestObject.attach("images", getImagePath(imageName));
    return requestObject;
  } else return requestObject.send(body);
};

const changesItemData: z.infer<typeof itemUpdateSchema> = {
  name: "Green Tree",
  description: "Green Tree with good shades",
  price: 5000,
  quantity: 3,
};

beforeEach(async () => {
  const [item] = await createItem([defaultItem], defaultShop);
  await ItemImage.bulkCreate(
    Array(4)
      .fill(null)
      .map((_, i) => ({
        itemId: item.id!,
        imageName: `image${i}.webp`,
        order: i,
      }))
  );
});

describe("should return 401 when unauthenticated", () => {
  authenticationTests(app, url + defaultItem.id, "patch", changesItemData);
});

describe("should return 400 with image errors", () => {
  imageInputTests(
    app,
    url,
    "post",
    defaultCookie(),
    MAX_IMAGE_COUNT,
    "images",
    changesItemData
  );
});

it("should return 400 validation error when accessed with invalid itemId", async () => {
  await Promise.all(
    invalidUuid.map((invalidId) =>
      getRequest(invalidId, defaultCookie(), changesItemData).expect(
        printedExpect(400)
      )
    )
  );
});

it("should return 400 validation error when accessed with invalid update property", async () => {
  await getRequest(defaultItem.id!, defaultCookie(), {
    ...changesItemData,
    invalidProperty: "hehehe",
  }).expect(400);
});
it("should return 400 validation error when accessed with no update property", async () => {
  await getRequest(defaultItem.id!, defaultCookie(), {}).expect(
    printedExpect(400)
  );
});

it("should return 200 when updated by admin, root, or owner", async () => {
  const { users }: { users: { id: string }[] } = await createUser([
    { privilege: 1 },
    { privilege: 0 },
  ]);

  await Promise.all(
    users
      .concat(defaultUser)
      .map((user) =>
        getRequest(
          defaultItem.id!,
          [forgeCookie(user)],
          changesItemData
        ).expect(200)
      )
  );
});

it("should return 403 unauthorized when item is not associated with user's shop", async () => {
  //create another user
  const [shop] = await createShop(1);
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", forgeCookie({ id: shop.userId }))
    .send(changesItemData)
    .expect(403);
});

it("should return 200 success when item is associated with user's shop with correct update data", async () => {
  const expectedBody = { ...defaultItem, ...changesItemData };
  await request(app)
    .patch(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send(changesItemData)
    .expect(200)
    .expect(async ({ body }) => {
      expect(objectClipper(body, expectedBody)).toEqual(expectedBody);
    });

  const item = await Item.findByPk(defaultItem.id);
  expect(objectClipper(item, expectedBody)).toEqual(expectedBody);
});

it("return 200 and delete image of specified order", async () => {
  await getRequest(defaultItem.id!, defaultCookie(), {
    imagesDelete: [0, 3, 4, 4],
  })
    .expect(200)
    .expect(({ body }: { body: z.infer<typeof itemDetailsOutputSchema> }) => {
      expect(objectClipper(body, defaultItem)).toEqual(defaultItem);
      expect(body?.images?.length).toBe(2);
      expect(body?.images?.map(({ imageName }) => imageName)).toEqual([
        "image1.webp",
        "image2.webp",
      ]);
    });
});

it("return 200 and reorder image", async () => {
  await getRequest(defaultItem.id!, defaultCookie(), {
    imagesReorder: [3, 1, 0, 2],
  })
    .expect(200)
    .expect(({ body }: { body: z.infer<typeof itemDetailsOutputSchema> }) => {
      expect(objectClipper(body, defaultItem)).toEqual(defaultItem);
      expect(body?.images?.length).toBe(4);
      expect(body?.images?.map(({ imageName }) => imageName)).toEqual([
        "image2.webp",
        "image1.webp",
        "image3.webp",
        "image0.webp",
      ]);
    });
});

it("return 200, updates item, delete, add and reorders item image", async () => {
  const item = await Item.findOne({ where: { id: defaultItem.id } });
  const currentVersion = item?.version ?? -1000;
  await getRequest(
    defaultItem.id!,
    defaultCookie(),
    {
      ...changesItemData,
      imagesDelete: [0],
      imagesReorder: [2, 0, 1, 3, 4, 5],
    },
    ["350kb.webp", "350kb.webp", "350kb.webp"]
  )
    .expect(printedExpect(200))
    .expect(({ body }: { body: z.infer<typeof itemDetailsOutputSchema> }) => {
      expect(
        objectClipper(body, { ...defaultItem, ...changesItemData })
      ).toEqual({ ...defaultItem, ...changesItemData });
      expect(body?.images?.length).toBe(6);
      expect(
        body?.images?.slice(0, 3)?.map(({ imageName }) => imageName)
      ).toEqual(["image2.webp", "image3.webp", "image1.webp"]);
    });
  await item?.reload();
  expect(item?.version).toBe(currentVersion + 1);
});

it("increments item version with each update", async () => {
  const item = await Item.findOne({ where: { id: defaultItem.id } });
  const currentVersion = item?.version ?? -1000;
  await getRequest(
    defaultItem.id!,
    defaultCookie(),
    {
      ...changesItemData,
    },
    ["350kb.webp", "350kb.webp", "350kb.webp"]
  ).expect(printedExpect(200));

  await item?.reload();
  expect(item?.version).toBe(currentVersion + 1);

  await getRequest(defaultItem.id!, defaultCookie(), {
    imagesDelete: [0],
    imagesReorder: [2, 0, 1, 3, 4, 5],
  }).expect(printedExpect(200));

  await item?.reload();
  expect(item?.version).toBe(currentVersion + 2);
});

it("doesn't increment item version if only quantity is updated", async () => {
  const item = await Item.findOne({ where: { id: defaultItem.id } });
  const currentVersion = item?.version ?? -1000;

  await getRequest(defaultItem.id!, defaultCookie(), {
    quantity: 10,
  }).expect(printedExpect(200));

  await item?.reload();
  expect(item?.version).toBe(currentVersion);
});
