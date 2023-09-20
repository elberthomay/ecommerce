import User from "../models/User";
import request from "supertest";
import { defaultUser, forgeCookie } from "./forgeCookie";
import { Express } from "express";
export default function authenticationTests(
  app: Express,
  url: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  body?: any
) {
  it("should return 401(unauthenticated) if not logged in", async () => {
    await request(app)[method](url).send(body).expect(401);
  });
  it("should return 401(unauthenticated) if digest is invalid", async () => {
    const malformedCookie = [
      forgeCookie({ id: defaultUser.id }, "invalidKey", "jwt", {
        expiresIn: 3600 * 24 * 30,
      }),
    ];
    await request(app)
      [method](url)
      .set("Cookie", malformedCookie)
      .send(body)
      .expect(401);
  });

  it("should return 401(unauthenticated) if token has expired", async () => {
    const expiredCookie = [
      forgeCookie({ id: defaultUser.id }, "invalidKey", "jwt", {
        expiresIn: -10,
      }),
    ];
    await request(app)
      [method](url)
      .set("Cookie", expiredCookie)
      .send(body)
      .expect(401);
  });
  it("should return 401(unauthenticated) if token is not yet valid", async () => {
    const expiredCookie = [
      forgeCookie({ id: defaultUser.id }, "invalidKey", "jwt", {
        notBefore: 10,
      }),
    ];
    await request(app)
      [method](url)
      .set("Cookie", expiredCookie)
      .send(body)
      .expect(401);
  });
  it("should return 401(unauthenticated) if token is invalid", async () => {
    const expiredCookie = ["jwt=invalidToken"];
    await request(app)
      [method](url)
      .set("Cookie", expiredCookie)
      .send(body)
      .expect(401);
  });
}
