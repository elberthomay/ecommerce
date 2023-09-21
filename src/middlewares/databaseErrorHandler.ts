import { Request, Response, NextFunction } from "express";
import sequelize from "sequelize";
import DatabaseError from "../errors/DatabaseError";

//convert sequelize DatabaseError to CustomError DatabaseError
const databaseErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof sequelize.DatabaseError) next(new DatabaseError(err));
  else next(err);
};

export default databaseErrorHandler;
