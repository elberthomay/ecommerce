import CustomError, { FormattedError } from "./CustomError";

export default class PasswordUnsetError extends CustomError {
  statusCode: number = 409;
  constructor() {
    super("Password is not set, please login via Google Oauth");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [],
    };
  }
}
