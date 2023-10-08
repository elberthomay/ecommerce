import { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "../errors/AuthorizationError";
import priviledgeEnum from "../var/priviledgeEnum";
import User from "../models/User";

/**
 *
 * @param value to be compared
 * @param target to be compared against
 * @param resourceName of resource requiring authorization
 * @returns none
 * @throws AuthorizationError if comparison failed
 */
const authorize = (
  value: any,
  target: typeof value | (typeof value)[],
  resourceName: string = "data"
) => {
  if (target instanceof Array) {
    if (target.some((comparator) => comparator === value)) return;
  } else {
    if (value === target) return;
  }
  throw new AuthorizationError(resourceName);
};

export const authorization =
  (
    allowed: (keyof priviledgeEnum | ((req: Request) => boolean))[],
    resourceName = "Data"
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User | null | undefined = (req as any).currentUser;
    const result = allowed.some((entry) => {
      if (typeof entry === "number") return currentUser?.privilege === entry;
      else return entry(req);
    });
    if (result) next();
    else throw new AuthorizationError(resourceName);
  };

export default authorize;
