import { Request, Response, NextFunction } from "express";
import catchAsync from "./catchAsync";
import { Model, ModelCtor } from "sequelize-typescript";
import NotFoundError from "../errors/NotFoundError";
import { Includeable, FindAttributeOptions, Order } from "sequelize";
import DuplicateDataError from "../errors/DuplicateDataError";
import User, { UserCreationAttribute } from "../models/User";
import { TokenTypes } from "../types/TokenTypes";

/**
 * Fetch data from provided model using property from Request object
 * store record on Request[modelName]
 * @param model to fetch data from
 * @param key property used to fetch data, accepts string property for both model and data, or a pair
 * @param location location of property on Request object
 * @param destination key on request object used to store fetch result, uses model.name if undefined
 * @param attributes column to select in query
 * @param include models to left join with
 * @param force set forcing condition,
 *   throw NotFoundError if force is "exist" and data is null
 *   throw DuplicateDataError if force is "absent" and data is not null
 * @param transformer transform the result or query before assignment, defaults to passthrough function
 * @returns none
 * @throws NotFoundError if query is null and force is "exist"
 * @throws DuplicateDataError if query is not null and force is "absent"
 */
export default function fetch<M extends any, I extends any>({
  model,
  key,
  location,
  destination,
  attributes,
  include,
  order,
  force = false,
  transformer = (data) => data,
}: {
  model: ModelCtor;
  key: Extract<keyof M, keyof I> | [keyof M, keyof I];
  location: "body" | "params" | "query" | "tokenData";
  destination?: string;
  attributes?: FindAttributeOptions;
  include?: Includeable | Includeable[];
  order?: Order;
  force?: false | "exist" | "absent";
  transformer?: (data: Model | null) => any;
}) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    //use different search key and location key if Array key is provided
    const searchCondition =
      key instanceof Array
        ? { [key[0]]: (req as any)[location][key[1]] }
        : { [key]: (req as any)[location][key] };

    // use destination as Request attribute if defined
    const destinationKey = destination ?? model.name;

    //run query, no need to catch error, sequelize DatabaseError handled by databaseErrorHandler middleware
    const existingData = await model.findOne({
      where: searchCondition,
      attributes: attributes,
      include: include,
      order: order,
    });

    //transform data
    (req as any)[destinationKey] = transformer(existingData);

    //throw error if force condition is not fulfilled
    if (force === "exist" && !existingData) throw new NotFoundError(model.name);
    if (force === "absent" && existingData)
      throw new DuplicateDataError(Object.keys(searchCondition)[0]);
    next();
  });
}

export const fetchCurrentUser = fetch<UserCreationAttribute, TokenTypes>({
  model: User,
  key: "id",
  location: "tokenData",
  destination: "currentUser",
  force: "exist",
});
