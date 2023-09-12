import { Request, Response, NextFunction } from "express";

const catchAsync =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next)
      .then(() => next())
      .catch((error: Error) => next(error));
  };
