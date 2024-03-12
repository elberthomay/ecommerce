import request from "supertest";
import { Express } from "express";
import { invalidUuid } from "../commonData";
import { invalidTagIds } from "../Tag/tagData";
import { defaultCookie } from "../user/userHelper";

export function itemIdQueryTest(
  app: Express,
  url: (itemId: string) => string,
  body: any
) {
  it("should return 400 validation error for invalid itemId", async () => {
    await Promise.all(
      invalidUuid.map((invalidId) =>
        request(app)
          .post(url(invalidId))
          .set("Cookie", defaultCookie())
          .send(body)
          .expect(400)
      )
    );
  });
}

export function invalidTagsTest(app: Express, url: string, body?: any) {
  it("return 400 for invalid tagId", async () => {
    await Promise.all(
      invalidTagIds.map((tagId) =>
        request(app)
          .post(url)
          .set("Cookie", defaultCookie())
          .send({ ...body, tags: [tagId] })
          .expect(400)
      )
    );
  });

  it("return 400 for empty tag array", async () => {
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send({ ...body, tags: [] })
      .expect(400);
  });

  it("return 400 for invalid tags property", async () => {
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send({ ...body, tags: "[1,2,3]" })
      .expect(400);
  });
}

export function noTagsTest(app: Express, url: string, body?: any) {
  it("return 400 for no tags property", async () => {
    await request(app)
      .post(url)
      .set("Cookie", defaultCookie())
      .send(body)
      .expect(400);
  });
}
