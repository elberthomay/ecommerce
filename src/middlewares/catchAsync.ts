import { Request, Response, NextFunction } from "express";

const catchAsync =
  (
    func: (
      req: Request<any, any, any, any>,
      res: Response,
      next: NextFunction
    ) => Promise<any>
  ) =>
  (req: Request<any, any, any, any>, res: Response, next: NextFunction) => {
    func(req, res, next).catch((error: Error) => next(error));
  };

export default catchAsync;
