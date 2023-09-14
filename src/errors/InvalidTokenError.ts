import CustomError, { FormattedError } from "./CustomError";

export default class InvalidTokenError extends CustomError {
  statusCode: number = 401;
  constructor() {
    super("Authentication Failed");
  }
  serializeError(): FormattedError {
    return { message: this.message, errors: [{ message: "Invalid Token" }] };
  }
}
