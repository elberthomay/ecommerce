import CustomError, { FormattedError } from "./CustomError";

export default class InvalidOrderStatusError extends CustomError {
  statusCode: number = 409;
  reason: string;
  constructor(reason: string) {
    super("Invalid order status");
    this.reason = reason;
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [
        {
          message: this.reason,
        },
      ],
    };
  }
}
