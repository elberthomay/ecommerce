import CustomError, { FormattedError } from "./CustomError";

export default class InventoryError extends CustomError {
  statusCode: number = 422;
  constructor() {
    super("Item out of stock");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [
        {
          message: "Requested value exceed available inventory",
          field: "quantity",
        },
      ],
    };
  }
}
