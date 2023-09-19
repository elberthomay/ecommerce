import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { TokenTypes } from "../types/TokenTypes";
import AuthenticationError from "../errors/AuthenticationError";

/**
 * produce handler that parse token data from cookie "jwt", stores result as Request.tokenData
 * if token is invalid and force is false, Request.tokenData would be null
 * @param force if true, AuthenticationError would be thrown if token is invalid, defaults true
 * @returns express request handler
 */
const authenticate =
  (force: boolean = true) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = (req.cookies["jwt"] ?? "") as string;
      const result = jwt.verify(token, process.env.JWT_SECRET!) as TokenTypes;
      (req as any).tokenData = result;
      next();
    } catch (err) {
      res.clearCookie("jwt");
      if (force) throw new AuthenticationError();
      else (req as any).tokenData = null;
      next();
    }
  };

export default authenticate;
