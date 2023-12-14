import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import ValidationError from "../errors/ValidationError";
import catchAsync from "./catchAsync";

export type ValidationErrorType = {
  key: "body" | "params" | "query";
  error: Joi.ValidationError;
};
/**
 * Validate input request data using input schema
 * @param schemas object containing 0~3 schema
 * @returns none
 * @throws ValidationError
 */
const validator = (schemas: {
  [key in "body" | "params" | "query"]?: Joi.Schema;
}) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // run validator for each key("body" | "params" | "query")

    const validationResults = (
      await Promise.all(
        (
          Object.entries(schemas) as [keyof typeof schemas, Joi.ObjectSchema][]
        ).map(
          async ([key, schema]): Promise<ValidationErrorType | undefined> => {
            try {
              const value = await schema.validateAsync(req[key], {
                abortEarly: false,
                errors: {
                  wrap: { label: false },
                },
              });
              req[key] = value; //replace request data with validated data otherwise
              return undefined;
            } catch (error: any) {
              return { key, error };
            }
          }
        )
      )
    ).filter((error): error is ValidationErrorType => error !== undefined);

    // for (const [key, schema] of Object.entries(schemas) as [
    //   keyof typeof schemas,
    //   Joi.ObjectSchema
    // ][]) {
    //   const { error, value } = schema.validate(req[key], {
    //     abortEarly: false,
    //     errors: {
    //       wrap: { label: false },
    //     },
    //   });

    //   //add to validationErrors if there's a error
    //   if (error) {
    //     validationErrors ??= {};
    //     validationErrors[key] = error;
    //   } else req[key] = value; //replace request data with validated data otherwise
    // }

    if (validationResults.length !== 0) {
      throw new ValidationError(validationResults);
    } else next();
  });

export default validator;
