import CustomError, { FormattedError } from "./CustomError";

export default class AddressLimitError extends CustomError {
  statusCode: number = 409;
  constructor(message: string) {
    super(message);
  }
  serializeError(): FormattedError {
    return {
      message: "Address limit exceeded",
      errors: [
        {
          field: "userAddress",
          message: this.message,
        },
      ],
    };
  }
}
