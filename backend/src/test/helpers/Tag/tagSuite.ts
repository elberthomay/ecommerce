import request from "supertest";
import Tag from "../../../models/Tag";
import { Express } from "express";
import { invalidTagIds, invalidTagNames } from "./tagData";
import { createUser, forgeCookie } from "../user/userHelper";
import { defaultRootUser } from "../user/userData";

export function testTagName(
  app: Express,
  url: string,
  method: "post" | "patch" | "delete"
) {
  it("should return 400 for invalid names", async () => {
    const tag = await Tag.create({ name: "food" });

    await Promise.all(
      invalidTagNames.map((name) =>
        request(app)
          [method](url + tag.id)
          .set("Cookie", forgeCookie(defaultRootUser))
          .send({ name })
          .expect(400)
      )
    );

    const updatedTag = await Tag.findByPk(tag.id);
    expect(updatedTag?.name).toEqual(tag.name);
  });
}

export function testTagId(
  app: Express,
  url: string,
  method: "post" | "patch" | "delete"
) {
  it("should return 400 for invalid tagId", async () => {
    await Promise.all(
      invalidTagIds.map((invalidTagId) =>
        request(app)
          [method](url + invalidTagId)
          .set("Cookie", forgeCookie(defaultRootUser))
          .send({ name: "food" })
          .expect(400)
      )
    );
  });
}

export function testTagNotFound(
  app: Express,
  url: string,
  method: "post" | "patch" | "delete",
  body: any
) {
  it("should return 404 for unavailable tag", async () => {
    await request(app)
      [method](url + "5")
      .set("Cookie", forgeCookie(defaultRootUser))
      .send(body)
      .expect(404);
  });
}
