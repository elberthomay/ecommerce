import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import { testTagId, testTagNotFound } from "../../../test/helpers/Tag/tagSuite";
import { createUser, forgeCookie } from "../../../test/helpers/user/userHelper";
import {
  defaultRootUser,
  defaultUser,
} from "../../../test/helpers/user/userData";
import { printedExpect } from "../../../test/helpers/assertionHelper";

const url = "/api/tag/";
const method = "delete";

describe("return 400 for validation error", () => {
  testTagId(app, url, method);
});

testTagNotFound(app, url, method, {});

it("should return 403 when accessed by non-admin/root", async () => {
  const tag = await Tag.create({ name: "food" });
  await createUser([defaultUser]);

  await request(app)
    .delete(url + tag.id)
    .set("Cookie", forgeCookie(defaultUser))
    .send()
    .expect(printedExpect(403));

  let deletedTag = await Tag.findByPk(tag.id);
  expect(deletedTag).not.toBeNull();

  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);

  await request(app)
    .delete(url + tag.id)
    .set("Cookie", forgeCookie(newAdmin))
    .send()
    .expect(printedExpect(200));

  deletedTag = await Tag.findByPk(tag.id);
  expect(deletedTag).toBeNull();
});

it("should successfuly deleted tag and return the deleted tag data", async () => {
  const tag = await Tag.create({ name: "food" });
  await request(app)
    .delete(url + tag.id)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send()
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body.id).toEqual(tag.id);
    });
  const deletedTag = await Tag.findByPk(tag.id);
  expect(deletedTag).toBeNull();
});
