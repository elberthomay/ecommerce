import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import { invalidTagIds } from "../../../test/helpers/IdHelper";
const url = "/api/tag/";

it("should return 400 for invalid names", async () => {
  const tag = await Tag.create({ name: "food" });
  const invalidNames = ["", "a".repeat(51)];
  await Promise.all(
    invalidNames.map((name) =>
      request(app)
        .patch(url + tag.id)
        .send({ name })
        .expect(400)
    )
  );
});

it("should return 400 for invalid tagId", async () => {
  await Promise.all(
    invalidTagIds.map((invalidTagId) =>
      request(app)
        .patch(url + invalidTagId)
        .send({ name: "food" })
        .expect(400)
    )
  );
});

it("should return 404 for unavailable tag", async () => {
  await request(app)
    .patch(url + "1")
    .send({ name: "food" })
    .expect(404);
});

it("should successfuly updated tag and return the updated tag data", async () => {
  const tag = await Tag.create({ name: "food" });
  const newName = "grocery";
  await request(app)
    .patch(url + tag.id)
    .send({ name: newName })
    .expect(200)
    .expect(({ body }) => {
      expect(body.id).toEqual(tag.id);
      expect(body.name).toEqual(newName);
    });
  const updatedTag = await Tag.findByPk(tag.id);
  expect(updatedTag?.name).toEqual(newName);
});
