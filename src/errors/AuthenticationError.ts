import CustomError, { FormattedError } from "./CustomError";

export default class AuthenticationError extends CustomError {
  statusCode: number = 401;
  constructor() {
    super("Authentication Failed");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [{ message: "You're not Authenticated" }],
    };
  }
}
