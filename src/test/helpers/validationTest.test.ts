import request from "supertest";

export default async function validationTest<T extends Record<string, any>>(
  getDefaultRequest: () => request.Test,
  defaultObject: T,
  testObject: Record<keyof T, any[]>,
  expectedCode: number = 400
) {
  // construct invalid request bodies from defaultObject and testObject
  const testRequests = Object.entries(testObject)
    .map(([key, invalidValues]) =>
      invalidValues.map((invalidValue) =>
        getDefaultRequest()
          .send({
            ...defaultObject,
            [key]: invalidValue,
          })
          .expect(({ body, statusCode }) => {
            expect(
              statusCode,
              `ValidationError: key: ${key}, value: ${invalidValue}\nerror: ${JSON.stringify(
                body
              )}`,
              { showPrefix: false, showStack: false }
            ).toBe(expectedCode);
          })
      )
    )
    .flat();

  await Promise.all(testRequests);
}
