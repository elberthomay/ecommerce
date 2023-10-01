import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../app";
import Tag from "../../../models/Tag";
import { invalidTagNames } from "../../../test/helpers/IdHelper";
const url = "/api/tag";

it("should return 400 for invalid names", async () => {
  await Promise.all(
    invalidTagNames.map((name) =>
      request(app).post(url).send({ name }).expect(400)
    )
  );
});

it("should return 409 for duplicate name", async () => {
  await Tag.create({ name: "food" });
  await request(app).post(url).send({ name: "food" }).expect(409);
});

it("should return 200 and create new tag", async () => {
  const tagNames = ["food", "clothing", "back to school"];
  await Promise.all(
    tagNames.map((name) =>
      request(app)
        .post(url)
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
