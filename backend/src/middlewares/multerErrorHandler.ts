import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import ImageError from "../errors/ImageError";

const multerErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof MulterError) {
    next(new ImageError(err.message));
  } else next(err);
};

export default multerErrorHandler;
