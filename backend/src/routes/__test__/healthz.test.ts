import request from "supertest";
import app from "../../app";

it("return 200", async () => {
  await request(app).get("/healthz").expect(200);
});
