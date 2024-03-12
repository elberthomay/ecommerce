import CustomError, { FormattedError } from "./CustomError";

export default class InventoryError extends CustomError {
  statusCode: number = 422;
  items?: { id: string; name: string; quantity: number }[];
  constructor(items?: { id: string; name: string; quantity: number }[]) {
    super("Item out of stock");
    this.items = items;
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: this.items
        ? this.items.map((item) => ({
            message: "Requested value exceed available inventory",
            item: item.name,
          }))
        : [
            {
              message: "Requested value exceed available inventory",
              field: "quantity",
            },
          ],
    };
  }
}
