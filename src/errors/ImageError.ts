import CustomError, { FormattedError } from "./CustomError";

export default class ImageError extends CustomError {
  statusCode: number = 400;
  constructor(
    message: string,
    public imageErrors?: { field: string; message: string }[]
  ) {
    super(message);
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: this.imageErrors ?? [
        { field: "images", message: "No Image Provided" },
      ],
    };
  }
}
