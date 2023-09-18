import CustomError, { FormattedError } from "./CustomError";

export class AuthorizationError extends CustomError {
  statusCode: number = 403;
  constructor(private resource: string) {
    super("Unauthorized");
  }
  serializeError(): FormattedError {
    return {
      message: this.message,
      errors: [
        {
          resource: this.resource,
          message: "You're not authorized to access this resource",
        },
      ],
    };
  }
}
