import { Request, Response, NextFunction } from "express";
import NotFoundError from "../errors/NotFoundError";

const pathNotFound = (req: Request, res: Response, next: NextFunction) => {
  throw new NotFoundError();
};

export default pathNotFound;
