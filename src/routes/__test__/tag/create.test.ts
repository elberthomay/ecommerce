import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import { testTagName } from "../../../test/helpers/Tag/tagSuite";
import { createUser, forgeCookie } from "../../../test/helpers/user/userHelper";
import {
  defaultRootUser,
  defaultUser,
} from "../../../test/helpers/user/userData";
import { invalidTagNames } from "../../../test/helpers/Tag/tagData";
const url = "/api/tag/";
const method = "post";

it("should return 400 for invalid names", async () => {
  const tag = await Tag.create({ name: "food" });
  await createUser([defaultRootUser]);

  await Promise.all(
    invalidTagNames.map((name) =>
      request(app)
        .post(url)
        .set("Cookie", forgeCookie(defaultRootUser))
        .send({ name })
        .expect(400)
    )
  );

  const updatedTag = await Tag.findByPk(tag.id);
  expect(updatedTag?.name).toEqual(tag.name);
});

it("should return 409 for duplicate name", async () => {
  await Tag.create({ name: "food" });
  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send({ name: "food" })
    .expect(409);
});

it("should return 403 when accessed by non-admin/root", async () => {
  const newName = "food";
  await createUser([defaultUser]);
  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(defaultUser))
    .send({ name: newName })
    .expect(403);

  let createdTag = await Tag.findOne({ where: { name: newName } });
  expect(createdTag).toBeNull();

  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);

  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(newAdmin))
    .send({ name: newName })
    .expect(201);

  createdTag = await Tag.findOne({ where: { name: newName } });
  expect(createdTag).not.toBeNull();
});

it("should return 200 and create new tag", async () => {
  const tagNames = ["food", "clothing", "back to school"];
  await Promise.all(
    tagNames.map((name) =>
      request(app)
        .post(url)
        .set("Cookie", forgeCookie(defaultRootUser))
        .send({ name })
        .expect(201)
        .expect(({ body }) => {
          expect(body.name).toEqual(name);
        })
    )
  );
  await Promise.all(
    tagNames.map(async (name) =>
      expect(await Tag.findOne({ where: { name } })).not.toBeNull()
    )
  );
});
