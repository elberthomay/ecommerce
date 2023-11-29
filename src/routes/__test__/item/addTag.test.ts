import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { invalidUuid } from "../../../test/helpers/commonData";
import Tag from "../../../models/Tag";
import { faker } from "@faker-js/faker";
import { invalidTagIds } from "../../../test/helpers/Tag/tagData";
import ItemTag from "../../../models/ItemTag";
import {
  invalidTagsTest,
  itemIdQueryTest,
  noTagsTest,
} from "../../../test/helpers/item/itemSuite";
import { defaultRootUser } from "../../../test/helpers/user/userData";

const url = (id: string) => `/api/item/${id}/tag`;
const defaultUrl = url(defaultItem.id!);
const method = "post";

const defaultBody = { tags: [1, 2, 3] };

const tagNames = ["food", "utensil", "vehicle", "furniture", "plants"];

beforeEach(async () => {
  await createItem([defaultItem], defaultShop);
});

describe("return 401 on authentication error", () => {
  authenticationTests(app, defaultUrl, method);
});

describe("return 400 on validation error", () => {
  itemIdQueryTest(app, url, defaultBody);
  invalidTagsTest(app, defaultUrl);
  noTagsTest(app, defaultUrl);
});

it("should return 404 not found error when itemId does not exist in db", async () => {
  await request(app)
    .post(url(faker.string.uuid()))
    .set("Cookie", defaultCookie())
    .send(defaultBody)
    .expect(404);
});

it("return 200 when accessed by the root or admin", async () => {
  const tagIds = (await Tag.bulkCreate(tagNames.map((name) => ({ name })))).map(
    (tag) => tag.id
  );

  const {
    users: [admin],
  } = await createUser([{ privilege: 1 }]);
  await request(app)
    .post(defaultUrl)
    .set("Cookie", forgeCookie(admin))
    .send({ tags: tagIds })
    .expect(200)
    .expect(({ body }) => {
      expect(body?.tags).toHaveLength(5);
    });

  await request(app)
    .post(defaultUrl)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send({ tags: tagIds })
    .expect(200);
});

it("return 403 when not accessed by the creator", async () => {
  const {
    users: [user],
  } = await createUser(1);
  await request(app)
    .post(defaultUrl)
    .set("Cookie", forgeCookie(user))
    .send(defaultBody)
    .expect(403);
});

it("should return 200 on successful add", async () => {
  const tagIds = (await Tag.bulkCreate(tagNames.map((name) => ({ name })))).map(
    (tag) => tag.id
  );
  await request(app)
    .post(defaultUrl)
    .set("Cookie", defaultCookie())
    .send({ tags: tagIds.slice(0, 3) })
    .expect(200)
    .expect(({ body }) => {
      expect(body?.tags).toHaveLength(3);
    });

  const addedTags = await ItemTag.findAll({
    where: { itemId: defaultItem.id },
    order: [["tagId", "ASC"]],
  });
  expect(addedTags).toHaveLength(3);
  expect(addedTags.map((itemTag) => itemTag.tagId)).toEqual(tagIds.slice(0, 3));

  //doesn't affect other item
  expect(await ItemTag.findAll()).toHaveLength(3);
});

it("should ignore tag that has been added or does not exist", async () => {
  const tagIds = (await Tag.bulkCreate(tagNames.map((name) => ({ name })))).map(
    (tag) => tag.id
  );
  await ItemTag.bulkCreate(
    tagIds.slice(0, 3).map((tagId) => ({ itemId: defaultItem.id, tagId }))
  );
  await createItem(1);

  await request(app)
    .post(defaultUrl)
    .set("Cookie", defaultCookie())
    .send({ tags: [...tagIds, 444, 333] })
    .expect(200)
    .expect(({ body }) => {
      expect(body?.tags).toHaveLength(5);
    });

  const addedTags = await ItemTag.findAll({
    where: { itemId: defaultItem.id },
    order: [["tagId", "ASC"]],
  });
  expect(addedTags).toHaveLength(5);
  expect(addedTags.map((itemTag) => itemTag.tagId)).toEqual(tagIds);

  //doesn't affect other item
  expect(await ItemTag.findAll()).toHaveLength(5);
});
