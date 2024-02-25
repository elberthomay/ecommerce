import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import { createUser, forgeCookie } from "../../../test/helpers/user/userHelper";
import {
  defaultRootUser,
  defaultUser,
} from "../../../test/helpers/user/userData";
import { invalidTagNames } from "../../../test/helpers/Tag/tagData";
import validationTest from "../../../test/helpers/validationTest.test";
import { z } from "zod";
import { tagCreateSchema } from "../../../schemas/tagSchema";
import { printedExpect } from "../../../test/helpers/assertionHelper";
const url = "/api/tag/";
const method = "post";

it("should return 400 for validation errors", async () => {
  const tag = await Tag.create({ name: "food" });
  await createUser([defaultRootUser]);
  await validationTest<z.infer<typeof tagCreateSchema>>(
    () => request(app).post(url).set("Cookie", forgeCookie(defaultRootUser)),
    { name: "brutonus" },
    { name: invalidTagNames }
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
    .expect(printedExpect(409));
});

it("should return 403 when accessed by non-admin/root", async () => {
  const newName = "food";
  await createUser([defaultUser]);
  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(defaultUser))
    .send({ name: newName })
    .expect(printedExpect(403));

  let createdTag = await Tag.findOne({ where: { name: newName } });
  expect(createdTag).toBeNull();

  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);

  await request(app)
    .post(url)
    .set("Cookie", forgeCookie(newAdmin))
    .send({ name: newName })
    .expect(printedExpect(201));

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
        .expect(printedExpect(201))
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
