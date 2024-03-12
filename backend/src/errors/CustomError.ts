export interface FormattedError {
  message: string;
  errors: any;
}

export default abstract class CustomError extends Error {
  abstract statusCode: number;
  abstract serializeError(): FormattedError;
}
