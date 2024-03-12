import CustomError, { FormattedError } from "./CustomError";

export default class NoAddressSelectedError extends CustomError {
  statusCode: number = 422;
  serializeError(): FormattedError {
    return {
      message: "Select a shipping address before proceeding with your order.",
      errors: [
        {
          field: "userAddress",
          message: "No address is selected",
        },
      ],
    };
  }
}
