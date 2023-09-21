import request from "supertest";
import quickExpressInstance from "../../test/quickExpressInstance";
import { NextFunction, Response, Request } from "express";
import databaseErrorHandler from "../databaseErrorHandler";
import errorHandler from "../errorHandler";
import sequelizeTest from "../../test/sequelizeTest";
import catchAsync from "../catchAsync";
import { AuthorizationError } from "../../errors/AuthorizationError";
it("convert sequelize DatabaseError to CustomError DatabaseError", async () => {
  const response = await request(
    quickExpressInstance([
      catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        //should throw QueryError
        await sequelizeTest.query("heya, this is an invalid query desu");
      }),
      databaseErrorHandler,
      errorHandler,
    ])
  )
    .get("/")
    .send()
    .expect(500);
  expect(response.body?.message).toBeDefined;
  expect(response.body?.message).toEqual("Database error has occured");
});
it("let other type of error pass through", async () => {
  const response = await request(
    quickExpressInstance([
      catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        //throw AuthorizationError
        throw new AuthorizationError("Shop");
      }),
      databaseErrorHandler,
      errorHandler,
    ])
  )
    .get("/")
    .send()
    .expect(403);
});
