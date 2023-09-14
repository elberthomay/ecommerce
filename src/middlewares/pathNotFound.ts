import { Request, Response, NextFunction } from "express";
import NotFoundError from "../errors/NotFoundError";

const pathNotFound = (req: Request, res: Response, next: NextFunction) => {
  console.log("reached pathNotFound");
  throw new NotFoundError();
};

export default pathNotFound;
