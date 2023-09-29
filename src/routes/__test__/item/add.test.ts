import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import {
  createDefaultShop,
  createShop,
  defaultShop,
} from "../../../test/helpers/shopHelper";
import _ from "lodash";
import { ItemCreateType } from "../../../types/itemTypes";
import {
  invalidDescription,
  invalidNames,
  invalidPrice,
  invalidQuantity,
} from "../../../test/helpers/item/itemData";
import Item, { ItemCreationAttribute } from "../../../models/Item";

const url = "/api/item";

const defaultCreateItem: ItemCreateType = _.omit(defaultItem, ["id", "shopId"]);

const assertItemCreationEquality =
  (expectedItem: Partial<ItemCreationAttribute>) =>
  async ({ body }: { body: any }) => {
    // correct returned item data
    expect(
      _.pick(body as ItemCreationAttribute, [
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
    expect(_.pick(item, ["name", "description", "price", "quantity"])).toEqual(
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

  it("should return 400 for missing property", async () => {
    const invalidBodies = [
      _.omit(defaultCreateItem, "name"), // no name
      _.omit(defaultCreateItem, "description"), // no description
      _.omit(defaultCreateItem, "price"), // no price
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

  it("should return 200 and create item with default quantity", async () => {
    await createItem(5, { id: defaultShop.id });
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(_.omit(defaultCreateItem, "quantity"))
      .expect(200)
      .expect(
        assertItemCreationEquality({ ...defaultCreateItem, quantity: 0 })
      );
    expect(await Item.count()).toBe(6);
  });

  it("should return 200 and successfully create a new item in user's shop", async () => {
    await createItem(5, { id: defaultShop.id });
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(defaultCreateItem)
      .expect(200)
      .expect(assertItemCreationEquality(defaultCreateItem));
    expect(await Item.count()).toBe(6);
  });
});
