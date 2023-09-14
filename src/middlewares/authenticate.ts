import { Request, Response, NextFunction } from "express";
import catchAsync from "./catchAsync";
import jwt from "jsonwebtoken";
import { TokenTypes } from "../types/TokenTypes";
import InvalidTokenError from "../errors/InvalidTokenError";
import sequelize from "sequelize";
import DatabaseError from "../errors/DatabaseError";
import User from "../models/User";

const authenticate = (force: boolean) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token: string = req.cookies["jwt"] ?? "";
      const result = jwt.verify(token, process.env.JWT_SECRET!) as TokenTypes;
      (req as any).currentUser = await User.findByPk(result.id);
      next();
    } catch (err) {
      if (err instanceof sequelize.DatabaseError) {
        throw new DatabaseError(err);
      } else {
        res.clearCookie("jwt");
        if (force) throw new InvalidTokenError();
        else next();
      }
    }
  });

export default authenticate;
