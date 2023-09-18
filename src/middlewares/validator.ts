import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import ValidationError from "../errors/ValidationError";

export type ValidationErrorType = {
  [key in "body" | "params" | "query"]?: Joi.ValidationError;
};

/**
 * Validate input request data using input schema
 * @param schemas object containing 0~3 schema
 * @returns none
 * @throws ValidationError
 */
const validator =
  (schemas: { [key in "body" | "params" | "query"]?: Joi.ObjectSchema }) =>
  (req: Request, res: Response, next: NextFunction) => {
    let validationErrors:
      | { [key in "body" | "params" | "query"]?: Joi.ValidationError }
      | null = null;

    // run validator for each key("body" | "params" | "query")

    (
      Object.entries(schemas) as [keyof typeof schemas, Joi.ObjectSchema][]
    ).forEach(([key, schema]) => {
      const { error, value } = schema.validate(req[key], {
        abortEarly: false,
        errors: {
          wrap: { label: false },
        },
      });

      if (error) {
        validationErrors ??= {};
        validationErrors[key] = error;
      } else req[key] = value; //replace request data with validated data otherwise
    });

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
    if (validationErrors) {
      next(new ValidationError(validationErrors));
    } else next();
  };

export default validator;
