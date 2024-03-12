import CustomError, { FormattedError } from "./CustomError";

export default class NotFoundError extends CustomError {
  statusCode: number = 404;
  constructor(private field?: string) {
    super(`${field ? field + " " : ""}Not Found`);
  }
  serializeError(): FormattedError {
    return { message: this.message, errors: [] };
  }
}
