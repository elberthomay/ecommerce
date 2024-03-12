import request from "supertest";
import app from "../../../app";
import { tokenEqualityTest } from "../../../test/helpers/user/userHelper";

it("set jwt cookie to empty string", async () => {
  await request(app)
    .post("/api/user/logout")
    .send()
    .expect(200)
    .expect(tokenEqualityTest(""));
});
