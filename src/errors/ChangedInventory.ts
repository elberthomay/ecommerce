import CustomError, { FormattedError } from "./CustomError";

export default class ChangedInventory extends CustomError {
  statusCode: number = 409;
  constructor() {
    super("Inventory status changed");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [{ message: "inventory changed" }],
    };
  }
}
