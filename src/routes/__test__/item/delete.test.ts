import app from "../../../app";
import request from "supertest";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import Item from "../../../models/Item";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shop/shopHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import { invalidUuid } from "../../../test/helpers/commonData";
import { faker } from "@faker-js/faker";
import { defaultRootUser } from "../../../test/helpers/user/userData";

const url = "/api/item/";
const method = "delete";

beforeEach(async () => {
  await createItem([defaultItem, {}, {}, {}], defaultShop);
});

describe("should return 401 when authentication error happens", () => {
  authenticationTests(app, url + defaultItem.id, method);
});

it("should return 400 validation error when accessed with invalid itemId", async () => {
  await Promise.all(
    invalidUuid.map((invalidId) =>
      request(app)
        .delete(url + invalidId)
        .set("Cookie", defaultCookie())
        .send()
        .expect(400)
    )
  );
});

it("should return 404 not found error when itemId does not exist in db", async () => {
  await request(app)
    .delete(url + faker.string.uuid())
    .set("Cookie", defaultCookie())
    .send()
    .expect(404);
});

it("should return 403 unauthorized when item is not associated with user's shop", async () => {
  //create another user
  const [item] = await createItem(1);
  await request(app)
    .delete(url + item.id)
    .set("Cookie", defaultCookie())
    .send()
    .expect(403);
});

it("should return 200 when deleted by admin or root", async () => {
  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);
  const [newItem] = await createItem(1); //create item for another user
  const count = await Item.count();

  await request(app)
    .delete(url + defaultItem.id)
    .set("Cookie", forgeCookie(newAdmin))
    .send()
    .expect(200);

  expect(await Item.findByPk(defaultItem.id)).toBeNull();
  expect(await Item.count()).toEqual(count - 1);

  await request(app)
    .delete(url + newItem.id)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send()
    .expect(200);

  expect(await Item.findByPk(defaultItem.id)).toBeNull();
  expect(await Item.count()).toEqual(count - 2);
});

it("should return 200 and succesfully delete item", async () => {
  await createItem(1); //create item for another user
  const count = await Item.count();
  await request(app)
    .delete(url + defaultItem.id)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200);
  const item = await Item.findByPk(defaultItem.id);
  expect(item).toBeNull();
  expect(await Item.count()).toEqual(count - 1);
});
