import request from "supertest";

export default async function validationTest<T extends Record<string, any>>(
  getDefaultRequest: () => request.Test,
  defaultObject: T,
  testObject: Record<keyof T, any[]>
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
          .expect((res: any) => {
            if (res.statusCode !== 400)
              console.error(
                `ValidationError \nkey: ${key}, value: ${invalidValue}, error: ${JSON.stringify(
                  res.body
                )}`
              );
          })
          .expect(400)
      )
    )
    .flat();

  await Promise.all(testRequests);
}
