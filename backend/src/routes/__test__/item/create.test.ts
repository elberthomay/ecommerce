import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { createShop, defaultShop } from "../../../test/helpers/shop/shopHelper";
import { pick, omit } from "lodash";
import {
  defaultCreateItem,
  invalidItemValues,
} from "../../../test/helpers/item/itemData";
import Item, { ItemCreationAttribute } from "../../../models/Item";
import Tag from "../../../models/Tag";
import ItemTag from "../../../models/ItemTag";
import imageInputTests from "../../../test/imageInputTests.test";
import { MAX_IMAGE_COUNT } from "@elycommerce/common";
import path from "path";
import ItemImage from "../../../models/ItemImage";
import { itemCreateSchema, itemDetailsOutputSchema } from "@elycommerce/common";
import { z } from "zod";
import { printedExpect } from "../../../test/helpers/assertionHelper";

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
    .expect(printedExpect(404));
});

describe("created default shop", () => {
  beforeEach(async () => await createShop([defaultShop]));

  describe("should return 400 with image errors", () => {
    imageInputTests(
      app,
      url,
      "post",
      defaultCookie(),
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
          .expect(printedExpect(400))
      )
    );
  });

  it("should return 400 for invalid property", async () => {
    const invalidBody = { ...defaultCreateItem, property: "invalid" };

    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(invalidBody)
      .expect(printedExpect(400));
  });

  it("should return 201 for duplicate tags", async () => {
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send({ ...defaultCreateItem, tags: [1, 1, 2] })
      .expect(printedExpect(201));
  });

  it("should return 201 and create item with default quantity", async () => {
    await createItem(5, { id: defaultShop.id });
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(omit(defaultCreateItem, "quantity"))
      .expect(printedExpect(201))
      .expect(
        assertItemCreationEquality({
          ...omit(defaultCreateItem, "tags"),
          quantity: 1,
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
      .expect(printedExpect(201))
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
      .expect(printedExpect(201))
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
      .expect(printedExpect(201))
      .expect(assertItemCreationEquality(omit(defaultCreateItem, "tags")))
      .expect(
        async ({ body }: { body: z.infer<typeof itemDetailsOutputSchema> }) => {
          expect(body?.images?.length).toBe(5);
          const newItem = await Item.findByPk(body.id, { include: ItemImage });
          expect(newItem?.images?.length).toBe(5);
          expect(itemDetailsOutputSchema.safeParse(body).success).toBe(true);
        }
      );
    expect(await Item.count()).toBe(6);
  });
});
