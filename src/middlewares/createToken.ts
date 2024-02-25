import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import { TokenTypes } from "../types/TokenTypes";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { loginSchema } from "../schemas/userSchema";

const createToken = (
  req: Request<unknown, unknown, z.infer<typeof loginSchema>>,
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
    res.cookie("jwt", token, { httpOnly: true, maxAge: tokenAge });
    return next();
  } else return next(new Error("tokenCreate middleware called without user"));
};

export default createToken;
