import { NextFunction, Request, Response } from "express";
import { TokenError } from "passport-oauth2";
import Oauth2TokenError from "../errors/Oauth2TokenError";

const oauth2ErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof TokenError) next(new Oauth2TokenError(error));
  else next(error);
};

export default oauth2ErrorHandler;
