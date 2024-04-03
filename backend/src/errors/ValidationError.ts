import CustomError, { FormattedError } from "./CustomError";
import { ZodError, z } from "zod";

export default class ValidationError extends CustomError {
  statusCode: number = 400;
  errors: ZodError<{
    body?: any;
    params?: any;
    query?: any;
  }>;
  constructor(
    errors: ZodError<{
      body?: any;
      params?: any;
      query?: any;
    }>
  ) {
    super("Error occurred during validation");
    this.errors = errors;
  }
  serializeError(): FormattedError {
    const formatted = this.errors.format((issue) => issue.message);
    return { message: this.message, errors: formatted };
  }
}
