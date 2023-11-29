import { MAX_IMAGE_COUNT } from "../var/constants";
import CustomError, { FormattedError } from "./CustomError";

export default class MaxImageExceeded extends CustomError {
  statusCode: number = 409;
  serializeError(): FormattedError {
    return {
      message: `An item cannot contain more than ${MAX_IMAGE_COUNT} items`,
      errors: [],
    };
  }
}
