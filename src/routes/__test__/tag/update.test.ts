import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import {
  testTagId,
  testTagName,
  testTagNotFound,
} from "../../../test/helpers/Tag/tagSuite";
import { createUser, forgeCookie } from "../../../test/helpers/user/userHelper";
import {
  defaultRootUser,
  defaultUser,
} from "../../../test/helpers/user/userData";

const url = "/api/tag/";
const method = "patch";

describe("return 400 for validation error", () => {
  testTagName(app, url, method);
  testTagId(app, url, method);
});

testTagNotFound(app, url, method, { name: "food" });

it("should return 403 when accessed by non-admin/root", async () => {
  const tag = await Tag.create({ name: "food" });
  await createUser([defaultUser]);
  const newName = "grocery";
  await request(app)
    .patch(url + tag.id)
    .set("Cookie", forgeCookie(defaultUser))
    .send({ name: newName })
    .expect(403);

  let updatedTag = await Tag.findByPk(tag.id);
  expect(updatedTag?.name).toEqual(tag.name);

  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);

  await request(app)
    .patch(url + tag.id)
    .set("Cookie", forgeCookie(newAdmin))
    .send({ name: newName })
    .expect(200);

  updatedTag = await Tag.findByPk(tag.id);
  expect(updatedTag?.name).toEqual(newName);
});

it("should return 409 for duplicate name", async () => {
  await Tag.create({ name: "food" });
  const tag = await Tag.create({ name: "grocery" });
  await request(app)
    .patch(url + tag.id)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send({ name: "food" })
    .expect(409);
});

it("should successfuly updated tag and return the updated tag data", async () => {
  const tag = await Tag.create({ name: "food" });
  const newName = "grocery";
  await request(app)
    .patch(url + tag.id)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send({ name: newName })
    .expect(200)
    .expect(({ body }) => {
      expect(body.id).toEqual(tag.id);
      expect(body.name).toEqual(newName);
    });
  const updatedTag = await Tag.findByPk(tag.id);
  expect(updatedTag?.name).toEqual(newName);
});
