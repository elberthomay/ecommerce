import { Request, Response, NextFunction } from "express";
import catchAsync from "./catchAsync";
import jwt from "jsonwebtoken";
import { TokenTypes } from "../types/TokenTypes";
import AuthenticationError from "../errors/AuthenticationError";
import sequelize from "sequelize";
import DatabaseError from "../errors/DatabaseError";
import User from "../models/User";

/**
 *
 * @param force
 * @returns
 */
const authenticate = (force: boolean) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token: string = req.cookies["jwt"] ?? "";
      const result = jwt.verify(token, process.env.JWT_SECRET!) as TokenTypes;
      const loggedInUser = await User.findByPk(result.id);
      if (!loggedInUser)
        throw new Error("Tokenized user id doesn't exist in db");
      (req as any).currentUser = loggedInUser;
      next();
    } catch (err) {
      if (err instanceof sequelize.DatabaseError) {
        throw new DatabaseError(err);
      } else {
        res.clearCookie("jwt");
        if (force) throw new AuthenticationError();
        else next();
      }
    }
  });

export default authenticate;
