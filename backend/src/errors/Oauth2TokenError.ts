import { TokenError } from "passport-oauth2";
import CustomError, { FormattedError } from "./CustomError";

export default class Oauth2TokenError extends CustomError {
  statusCode: number = 400;
  constructor(tokenError: TokenError) {
    super(tokenError.code);
  }
  serializeError(): FormattedError {
    return { message: this.message, errors: [] };
  }
}
