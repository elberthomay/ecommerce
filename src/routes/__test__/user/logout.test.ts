import request from "supertest";
import app from "../../../app";

it("set jwt cookie to empty string", async () => {
  const response = await request(app)
    .post("/api/user/logout")
    .send()
    .expect(200);
  const cookieString: string = response.headers["set-cookie"][0];
  const cookieAttributes: string[][] = cookieString
    .split(";")
    .map((attribute) => attribute.trim().split("="));
  expect(
    cookieAttributes.some((cookieAttribute) => {
      const [attributeName, attributeValue] = cookieAttribute;
      if (attributeName === "jwt") {
        expect(attributeValue).toBe("");
        return true;
      } else return false;
    })
  ).toBe(true);
});
