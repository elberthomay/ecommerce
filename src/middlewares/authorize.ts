import { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "../errors/AuthorizationError";

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

export default authorize;
