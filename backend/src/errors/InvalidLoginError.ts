import CustomError, { FormattedError } from "./CustomError";

export default class InvalidLoginError extends CustomError {
  statusCode: number = 401;
  constructor() {
    super("Invalid Username or Password");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [
        {
          message:
            "The provided credentials are incorrect. Please check your email or password and try again.",
        },
      ],
    };
  }
}
