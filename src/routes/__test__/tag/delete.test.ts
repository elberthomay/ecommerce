import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../app";
import Tag from "../../../models/Tag";
const url = "/api/tag/";

it("should return 400 for invalid tagId", async () => {
  const invalidTagIds = [0, -1, -100, 1001, "fkheev", "notatag", "gvece cece"];
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
