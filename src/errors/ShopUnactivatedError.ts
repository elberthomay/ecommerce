import CustomError, { FormattedError } from "./CustomError";

export default class ShopUnactivatedError extends CustomError {
  statusCode: number = 409;
  constructor() {
    super("Shop is unactivated");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [{ message: "Activate store before Invoking operation" }],
    };
  }
}
