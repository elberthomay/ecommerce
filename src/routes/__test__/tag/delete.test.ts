import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import { invalidTagIds } from "../../../test/helpers/IdHelper";
const url = "/api/tag/";

it("should return 400 for invalid tagId", async () => {
  await Promise.all(
    invalidTagIds.map((invalidTagId) =>
      request(app)
        .delete(url + invalidTagId)
        .send()
        .expect(400)
    )
  );
});

it("should return 404 for unavailable tag", async () => {
  await request(app)
    .delete(url + "1")
    .send()
    .expect(404);
});

it("should successfuly deleted tag and return the deleted tag data", async () => {
  const tag = await Tag.create({ name: "food" });
  await request(app)
    .delete(url + tag.id)
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body.id).toEqual(tag.id);
    });
  const deletedTag = await Tag.findByPk(tag.id);
  expect(deletedTag).toBeNull();
});
