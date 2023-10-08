import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import CaptchaTokenError from "../errors/CaptchaTokenError";

/**
 * Create an assessment to analyze the risk of an UI action. Note that
 * this example does set error boundaries and returns `null` for
 * exceptions.
 *
 * projectID: GCloud Project ID
 * recaptchaSiteKey: reCAPTCHA key obtained by registering a domain/app to use recaptcha services.
 * token: The token obtained from the client on passing the recaptchaSiteKey.
 * recaptchaAction: Action name corresponding to the token.
 */

export default class CaptchaAssessor {
  private client: RecaptchaEnterpriseServiceClient | null = null;

  async createAssessment({
    recaptchaSiteKey,
    token,
    recaptchaAction,
  }: {
    recaptchaSiteKey: string;
    token: string;
    recaptchaAction: string;
  }) {
    // Create the reCAPTCHA client & set the project path. There are multiple
    // ways to authenticate your client. For more information see:
    // https://cloud.google.com/docs/authentication
    // TODO: To avoid memory issues, move this client generation outside
    // of this example, and cache it (recommended) or call client.close()
    // before exiting this method.
    if (this.client === null)
      this.client = new RecaptchaEnterpriseServiceClient();
    const client = this.client;
    const projectPath = client.projectPath(process.env.GOOGLE_PROJECT_ID!);

    // Build the assessment request.
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: recaptchaSiteKey,
        },
      },
      parent: projectPath,
    };

    // client.createAssessment() can return a Promise or take a Callback
    const [response] = await client.createAssessment(request);

    // Check if the token is valid.
    if (!response?.tokenProperties?.valid) {
      throw new CaptchaTokenError(response?.tokenProperties?.invalidReason!);
    }

    // Check if the expected action was executed.
    // The `action` property is set by user client in the
    // grecaptcha.enterprise.execute() method.
    if (response.tokenProperties.action === recaptchaAction) {
      // Get the risk score and the reason(s).
      // For more information on interpreting the assessment,
      // see: https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
      return response?.riskAnalysis;
    } else {
      throw new CaptchaTokenError("Token action mismatch has occured");
    }
  }
}
