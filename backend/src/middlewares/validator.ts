import { Request, Response, NextFunction } from "express";
import ValidationError from "../errors/ValidationError";
import catchAsync from "./catchAsync";
import { ZodError, z } from "zod";

/**
 * Validate input request data using input schema
 * @param schema object containing 0~3 schema
 * @returns none
 * @throws ValidationError
 */
const validator = (
  schema: Partial<Record<"body" | "params" | "query", z.ZodTypeAny>>
) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    //create unified schema
    const unifiedSchema = z.object(schema);
    const validatedData = await unifiedSchema.safeParseAsync(req);
    if (validatedData.success) {
      (
        Object.entries(validatedData.data) as [keyof typeof schema, any][]
      ).forEach(([key, value]) => (req[key] = value));
      return next();
    } else throw new ValidationError(validatedData.error);
  });

export default validator;
