import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import ValidationError from "../errors/ValidationError";

const validator =
  (schemas: { [key in "body" | "params" | "query"]?: ObjectSchema }) =>
  (req: Request, res: Response, next: NextFunction) => {
    let validationErrors:
      | { [key in "body" | "params" | "query"]?: any }
      | null = null;
    for (const [key, schema] of Object.entries(schemas) as [
      keyof typeof schemas,
      ObjectSchema
    ][]) {
      const data = req[key];
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        errors: {
          wrap: { label: false },
        },
      });

      if (error) {
        const errorObject = error.details.map((detail) => ({
          label: detail.context?.label,
          message: detail.message,
        }));
        validationErrors ??= {};
        validationErrors[key] = errorObject;
      } else req[key] = value;
    }
    if (validationErrors) {
      next(new ValidationError(validationErrors));
    } else next();
  };

export default validator;
