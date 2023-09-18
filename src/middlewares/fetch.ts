import { Request, Response, NextFunction } from "express";
import catchAsync from "./catchAsync";
import { Model, ModelCtor } from "sequelize-typescript";
import DatabaseError from "../errors/DatabaseError";
import NotFoundError from "../errors/NotFoundError";
import sequelize from "sequelize";

/**
 * Fetch data from provided model using property from Request object
 * store record on Request[modelName]
 * @param model model to fetch data from
 * @param key property used to fetch data, accepts string property for both model and data, or a pair
 * @param location location of property on Request object
 * @returns none
 */
export default function fetch<M extends any, I extends any>({
  model,
  key,
  location,
  force = false,
}: {
  model: ModelCtor;
  key: Extract<keyof M, keyof I> | [keyof M, keyof I];
  location: "body" | "params" | "query";
  force?: boolean;
}) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searchCondition =
        key instanceof Array
          ? {
              [key[0]]: req[location][key[1]],
            }
          : {
              [key]: req[location][key],
            };
      console.log(searchCondition);
      const existingData = await model.findOne({
        where: searchCondition,
      });
      (req as any)[model.name] = existingData;
      console.log((req as any)[model.name]);
      if (force && !existingData) throw new NotFoundError(model.name);
      next();
    } catch (error: any) {
      if (error instanceof sequelize.DatabaseError)
        throw new DatabaseError(error);
      else throw error;
    }
  });
}
