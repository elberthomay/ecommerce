import authenticationTests from "../../test/authenticationTests.test";
import quickExpressInstance from "../../test/quickExpressInstance";
import request from "supertest";
import authenticate from "../authenticate";
import errorHandler from "../errorHandler";
import { NextFunction, Request, Response } from "express";
import { defaultCookie, defaultUser } from "../../test/helpers/user/userHelper";

describe("Test authentication with malformed or invalid token", () =>
  authenticationTests(
    quickExpressInstance([authenticate(true), errorHandler]),
    "/",
    "get"
  ));

it("should set Request.tokenData as null if force is false", async () => {
  await request(
    quickExpressInstance([
      authenticate(false),
      (req: Request, res: Response, next: NextFunction) => {
        expect((req as any).tokenData).toBeNull();
        res.json({ status: "success" });
      },
      errorHandler,
    ])
  )
    .get("/")
    .set("Cookie", ["jwt=invalidtoken"])
    .send()
    .expect(200);
});

it("should set Request.tokenData with data of TokenType if token is valid", async () => {
  await request(
    quickExpressInstance([
      authenticate(true),
      (req: Request, res: Response, next: NextFunction) => {
        expect((req as any).tokenData?.id).toEqual(defaultUser.id);
        res.json({ status: "success" });
      },
      errorHandler,
    ])
  )
    .get("/")
    .set("Cookie", defaultCookie())
    .send()
    .expect(200);
});
