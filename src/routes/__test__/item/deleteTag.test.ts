import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
import {
  invalidTagsTest,
  itemIdQueryTest,
  noTagsTest,
} from "../../../test/helpers/item/itemSuite";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import Tag from "../../../models/Tag";
import { defaultRootUser } from "../../../test/helpers/user/userData";
import ItemTag from "../../../models/ItemTag";

const url = (itemId: string) => `/api/item/${itemId}/tag`;
const defaultUrl = url(defaultItem.id!);

const method = "delete";

const tagNames = ["food", "utensil", "vehicle", "furniture", "plants"];

const defaultBody = { tags: [1, 2, 3] };

beforeEach(async () => {
  await createItem([defaultItem], defaultShop);
  const [item] = await createItem(1);
  const tags = await Tag.bulkCreate(tagNames.map((name) => ({ name })));
  await ItemTag.bulkCreate(
    tags.map((tag) => ({ itemId: defaultItem.id, tagId: tag.id }))
  );
  await ItemTag.bulkCreate(
    tags.map((tag) => ({ itemId: item.id, tagId: tag.id }))
  );
});

describe("return 401 for authentication errors", () => {
  authenticationTests(app, defaultUrl, method);
});

describe("return 400 for validation errors", () => {
  itemIdQueryTest(app, url, defaultBody);
  invalidTagsTest(app, defaultUrl);
  noTagsTest(app, defaultUrl);
});

it("should return 404 not found error when itemId does not exist in db", async () => {
  await request(app)
    .delete(url(faker.string.uuid()))
    .set("Cookie", defaultCookie())
    .send(defaultBody)
    .expect(404);
});

it("return 200 when accessed by the root or admin", async () => {
  const tagIds = (
    await ItemTag.findAll({ where: { itemId: defaultItem.id } })
  ).map((tag) => tag.tagId);

  const {
    users: [admin],
  } = await createUser([{ privilege: 1 }]);
  await request(app)
    .delete(defaultUrl)
    .set("Cookie", forgeCookie(admin))
    .send({ tags: tagIds })
    .expect(200)
    .expect(({ body }) => {
      expect(body?.tags).toHaveLength(0);
    });

  expect(
    await ItemTag.findAll({ where: { itemId: defaultItem.id } })
  ).toHaveLength(0);

  await request(app)
    .delete(defaultUrl)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send({ tags: tagIds })
    .expect(200);
});

it("return 403 when not accessed by the creator", async () => {
  const {
    users: [user],
  } = await createUser(1);
  await request(app)
    .delete(defaultUrl)
    .set("Cookie", forgeCookie(user))
    .send(defaultBody)
    .expect(403);
});

it("return 200 with no tag deleted if none of the tags exist", async () => {
  await request(app)
    .delete(defaultUrl)
    .set("Cookie", defaultCookie())
    .send({ tags: [999, 998, 997] })
    .expect(200);

  const tagInDefaultItem = await ItemTag.findAll({
    where: { itemId: defaultItem.id },
  });
  expect(tagInDefaultItem).toHaveLength(5);
});

it("should return 200 on successful delete", async () => {
  const tagIds = (
    await ItemTag.findAll({ where: { itemId: defaultItem.id } })
  ).map((tag) => tag.tagId);
  await request(app)
    .delete(defaultUrl)
    .set("Cookie", defaultCookie())
    .send({ tags: [...tagIds.slice(0, 3), 998, 997, 996] })
    .expect(200)
    .expect(({ body }) => {
      expect(body?.tags).toHaveLength(2);
    });

  const remainingTags = await ItemTag.findAll({
    where: { itemId: defaultItem.id },
    order: [["tagId", "ASC"]],
  });
  expect(remainingTags).toHaveLength(2);
  expect(remainingTags.map((itemTag) => itemTag.tagId)).toEqual(
    tagIds.slice(3)
  );

  //doesn't affect other item
  expect(await ItemTag.findAll()).toHaveLength(7);
});
