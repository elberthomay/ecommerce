import request from "supertest";
export const printedExpect = (code: number) => (res: request.Response) => {
  if (res.statusCode !== code) console.error(JSON.stringify(res.body));
  expect(code);
};
