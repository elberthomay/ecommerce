import { Request, Response, NextFunction } from "express";
import CustomError from "../errors/CustomError";
import DatabaseError from "../errors/DatabaseError";
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof CustomError) {
    if (err instanceof DatabaseError) console.error(err);
    res.status(err.statusCode).json(err.serializeError());
  } else {
    console.error(err);
    res.status(500).json({ status: "error", message: "Unknown Error Occured" });
  }
};

export default errorHandler;
