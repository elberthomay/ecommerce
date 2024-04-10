import CustomError, { FormattedError } from "./CustomError";
import { ZodError, z } from "zod";

export default class ValidationMessageError extends CustomError {
  statusCode: number = 400;
  constructor(message: string) {
    super(message);
  }
  serializeError(): FormattedError {
    return { message: this.message, errors: [] };
  }
}
