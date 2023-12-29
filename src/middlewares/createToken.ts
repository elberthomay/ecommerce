import { NextFunction, Request, Response } from "express";
import { UserLoginType } from "../types/userTypes";
import User from "../models/User";
import { TokenTypes } from "../types/TokenTypes";
import jwt from "jsonwebtoken";

const createToken = (
  req: Request<unknown, unknown, UserLoginType>,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as User | undefined;
  const loginData = req.body;
  if (user) {
    const tokenData: TokenTypes = { id: user.id };
    const tokenAge = loginData.rememberMe ? 2592000000 : 86400000; //one month or 1 day
    const token = jwt.sign(tokenData, process.env.JWT_SECRET!, {
      expiresIn: tokenAge.toString(),
    });
    return res
      .cookie("jwt", token, { httpOnly: true, maxAge: tokenAge })
      .json({ status: "success" });
  } else return next(new Error("tokenCreate middleware called without user"));
};

export default createToken;
