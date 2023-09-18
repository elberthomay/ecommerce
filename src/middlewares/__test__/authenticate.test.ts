import User from "../../models/User";
import authenticationTests from "../../test/authenticationTests.test";
import { defaultUser } from "../../test/forgeCookie";
import quickExpressInstance from "../../test/quickExpressInstance";
import authenticate from "../authenticate";

beforeEach(async () => {
  await User.create(defaultUser);
});

describe("Run authentication tests", () => {
  authenticationTests(quickExpressInstance(authenticate(true)), "/", "get");
});
