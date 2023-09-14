import Joi from "joi";
import CustomError, { FormattedError } from "./CustomError";
import { ValidationErrorType } from "../middlewares/validator";

type SerializedError = {
  [key in "body" | "params" | "query"]?: { field?: string; message: string }[];
};

export default class ValidationError extends CustomError {
  statusCode: number = 400;
  errors: ValidationErrorType;
  constructor(errors: ValidationErrorType) {
    super("Error occured during validation");
    this.errors = errors;
  }
  serializeError(): FormattedError {
    const serializedError: SerializedError = {};

    for (const [key, error] of Object.entries(this.errors) as [
      keyof typeof this.errors,
      Joi.ValidationError
    ][]) {
      serializedError[key] = error.details.map((detail) => ({
        field: detail.context?.label,
        message: detail.message,
      }));
    }
    return { message: this.message, errors: serializedError };
  }
}
