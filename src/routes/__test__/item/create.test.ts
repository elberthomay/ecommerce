import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createDefaultUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { createShop, defaultShop } from "../../../test/helpers/shop/shopHelper";
import { pick, omit } from "lodash";
import {
  defaultCreateItem,
  invalidDescription,
  invalidNames,
  invalidPrice,
  invalidQuantity,
} from "../../../test/helpers/item/itemData";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Tag from "../../../models/Tag";
import ItemTag from "../../../models/ItemTag";
import { invalidTagIds } from "../../../test/helpers/Tag/tagData";
import imageInputTests from "../../../test/imageInputTests.test";
import { MAX_IMAGE_COUNT } from "../../../var/constants";
import { ItemDetailsOutputType } from "../../../types/itemTypes";
import { defaultUser } from "../../../test/helpers/user/userData";
import path from "path";
import ItemImage from "../../../models/ItemImage";
import { itemDetailsOutputSchema } from "../../../schemas.ts/itemSchema";

const url = "/api/item";

const getImagePath = (fileName: string) =>
  path.resolve(__dirname, "..", "..", "..", "test", "testImage", fileName);

const assertItemCreationEquality =
  (expectedItem: Partial<ItemCreationAttribute>) =>
  async ({ body }: { body: any }) => {
    // correct returned item data
    expect(
      pick(body as ItemCreationAttribute, [
        "name",
        "description",
        "price",
        "quantity",
      ])
    ).toEqual(expectedItem);
    const item = await Item.findByPk(body?.id);

    // correct returned item id
    expect(item).toBeDefined();

    //correct created item
    expect(pick(item, ["name", "description", "price", "quantity"])).toEqual(
      expectedItem
    );
  };

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, url, "post", defaultItem);
});

it("should return 404 when shop is unactivated", async () => {
  await createDefaultUser();
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send(defaultCreateItem)
    .expect(404);
});

describe("created default shop", () => {
  beforeEach(async () => await createShop([defaultShop]));

  describe("should return 400 with image errors", () => {
    imageInputTests(
      app,
      url,
      "post",
      [forgeCookie(defaultUser, undefined, "secret", "jwt")],
      MAX_IMAGE_COUNT,
      "images",
      defaultCreateItem
    );
  });

  it("should return 400 for missing property", async () => {
    const invalidBodies = [
      omit(defaultCreateItem, "name"), // no name
      omit(defaultCreateItem, "description"), // no description
      omit(defaultCreateItem, "price"), // no price
    ];

    await Promise.all(
      invalidBodies.map((invalidBody) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send(invalidBody)
          .expect(400)
      )
    );
  });

  it("should return 400 for invalid name", async () => {
    await Promise.all(
      invalidNames.map((name) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send({ ...defaultCreateItem, name })
          .expect(400)
      )
    );
  });

  it("should return 400 for invalid description", async () => {
    await Promise.all(
      invalidDescription.map((description) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send({ ...defaultCreateItem, description })
          .expect(400)
      )
    );
  });

  it("should return 400 for invalid price", async () => {
    await Promise.all(
      invalidPrice.map((price) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send({ ...defaultCreateItem, price })
          .expect(400)
      )
    );
  });

  it("should return 400 for invalid quantity", async () => {
    await Promise.all(
      invalidQuantity.map((quantity) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send({ ...defaultCreateItem, quantity })
          .expect(400)
      )
    );
  });

  it("should return 400 for invalid property", async () => {
    const invalidBody = { ...defaultCreateItem, property: "invalid" };

    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(invalidBody)
      .expect(400);
  });

  it("should return 400 for invalid tags", async () => {
    await Promise.all(
      invalidTagIds.map((tagId) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send({ ...defaultCreateItem, tags: [tagId, 12] })
          .expect(400)
      )
    );
  });

  it("should return 400 for duplicate tags", async () => {
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send({ ...defaultCreateItem, tags: [1, 1, 2] })
      .expect(400);
  });

  it("should return 201 and create item with default quantity", async () => {
    await createItem(5, { id: defaultShop.id });
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(omit(defaultCreateItem, "quantity"))
      .expect(201)
      .expect(
        assertItemCreationEquality({
          ...omit(defaultCreateItem, "tags"),
          quantity: 0,
        })
      );
    expect(await Item.count()).toBe(6);
  });

  it("should return 201 and create item with tag", async () => {
    await createItem(5, { id: defaultShop.id });
    const tagNames = ["food", "utensils", "pots"];
    const tags = await Tag.bulkCreate(tagNames.map((name) => ({ name })));

    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send({ ...defaultCreateItem, tags: tags.map((tag) => tag.id) })
      .expect(201)
      .expect(
        assertItemCreationEquality({
          ...omit(defaultCreateItem, "tags"),
        })
      )
      .expect(async ({ body }) => {
        const item: ItemCreationAttribute = body;
        const tags = await ItemTag.findAll({ where: { itemId: item.id } });
        expect(tags).toHaveLength(tags.length);
        expect(item.tags).toHaveLength(tags.length);
      });
    expect(await Item.count()).toBe(6);
  });

  it("should return 201 and create item with tag, skipping nonexistent tag id", async () => {
    await createItem(5, { id: defaultShop.id });
    const tagNames = ["food", "utensils", "pots"];
    const tags = await Tag.bulkCreate(tagNames.map((name) => ({ name })));

    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send({
        ...defaultCreateItem,
        tags: [...tags.map((tag) => tag.id), 356, 223],
      })
      .expect(201)
      .expect(
        assertItemCreationEquality({
          ...omit(defaultCreateItem, "tags"),
        })
      )
      .expect(async ({ body }) => {
        const item: ItemCreationAttribute = body;
        const tags = await ItemTag.findAll({ where: { itemId: item.id } });
        expect(tags).toHaveLength(tags.length);
        expect(item.tags).toHaveLength(tags.length);
      });
    expect(await Item.count()).toBe(6);
  });

  it("should return 201 and successfully create a new item in user's shop with image, and return with expected schema", async () => {
    await createItem(5, { id: defaultShop.id });
    const imageArray = Array(5).fill(getImagePath("350kb.webp"));

    let requestObject = request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .type("multipart/form-data")
      .field("body", JSON.stringify(defaultCreateItem));

    for (const image of imageArray) {
      requestObject = requestObject.attach(`images`, image);
    }

    await requestObject
      .expect(201)
      .expect(assertItemCreationEquality(omit(defaultCreateItem, "tags")))
      .expect(async ({ body }: { body: ItemDetailsOutputType }) => {
        expect(body?.images?.length === 5).toBeTruthy();
        const newItem = await Item.findByPk(body.id, { include: ItemImage });
        expect(newItem?.images?.length === 5).toBeTruthy();
      })
      .expect(async ({ body }: { body: ItemDetailsOutputType }) => {
        expect(itemDetailsOutputSchema.validateAsync(body)).resolves;
      });
    expect(await Item.count()).toBe(6);
  });
});
