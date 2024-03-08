import CustomError, { FormattedError } from "./CustomError";

export default class NoItemInCartError extends CustomError {
  statusCode: number = 422;
  items?: { id: string; name: string; quantity: number }[];
  constructor() {
    super("No item in cart");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [],
    };
  }
}
