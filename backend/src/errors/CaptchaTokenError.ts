import CustomError, { FormattedError } from "./CustomError";
import captchaEnterprise from "@google-cloud/recaptcha-enterprise";

export default class CaptchaTokenError extends CustomError {
  statusCode: number = 400;
  constructor(reason: number | string) {
    if (typeof reason === "number") reason = "AssessmentErrorOccured";
    super(reason);
  }
  serializeError(): FormattedError {
    return {
      message: "Error assessing captcha token",
      errors: [{ message: this.message }],
    };
  }
}
