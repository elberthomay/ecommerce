import { Request, Response, NextFunction } from "express";
import CustomError from "../errors/CustomError";
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof CustomError) {
    res.status(err.statusCode).json(err.serializeError());
    //   } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    //     // Handle JSON parsing errors (e.g., invalid JSON format)
    //     return res.status(400).json({ error: 'Invalid JSON format' });
  } else {
    console.error(err);
    res.status(500).json({ status: "error", message: "Unknown Error Occured" });
  }
};

export default errorHandler;
