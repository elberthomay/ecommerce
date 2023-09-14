import { Request, Response, NextFunction } from "express";
import catchAsync from "./catchAsync";
import { Model, ModelCtor } from "sequelize-typescript";
import DatabaseError from "../errors/DatabaseError";
import NotFoundError from "../errors/NotFoundError";

/**
 * Fetch data from provided model using property from Request object
 * store record on Request[modelName]
 * @param model model to fetch data from
 * @param key property used to fetch data
 * @param location location of property on Request object
 * @returns none
 */
export default function fetch<M extends any, I extends any>(
  model: ModelCtor,
  key: Extract<keyof M, keyof I> | [keyof M, keyof I],
  location: "body" | "params" | "query",
  force: boolean = false
) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existingData = await model.findOne({
        where:
          key instanceof Array
            ? {
                [key[0]]: req[location][key[1]],
              }
            : {
                [key]: req[location][key],
              },
      });
      (req as any)[model.name] = existingData;
      if (force && !existingData) throw new NotFoundError(model.name);
      next();
    } catch (error: any) {
      throw new DatabaseError(error);
    }
  });
}
