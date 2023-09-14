import CustomError, { FormattedError } from "./CustomError";

export default class DuplicateDataError extends CustomError {
  statusCode: number = 409;
  field: string;
  constructor(field: string) {
    super(`${field} already existed`);
    this.field = field;
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [{ field: this.field, error: this.message }],
    };
  }
}
