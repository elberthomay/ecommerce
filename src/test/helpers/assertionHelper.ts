import { Response } from "supertest";
import { ZodType } from "zod";
export const printedExpect =
  (expectedStatus: number) =>
  ({ body, statusCode }: Response) => {
    expect(statusCode, JSON.stringify(body, null, 2), {
      showPrefix: false,
    }).toBe(expectedStatus);
  };

export const validatedExpect =
  <T>(
    zodSchema: ZodType<T>,
    callback?: (data: T, res: Response) => Promise<any> | void
  ) =>
  async (res: Response) => {
    const validationResult = zodSchema.safeParse(res.body);
    expect(
      validationResult.success,
      `${
        !validationResult.success
          ? JSON.stringify(validationResult.error.format(), null, 2)
          : ""
      }\nbody: \n${JSON.stringify(res.body, null, 2)}`,
      { showPrefix: false, showMatcherMessage: false }
    ).toBe(true);
    if (validationResult.success) await callback?.(validationResult.data, res);
  };
