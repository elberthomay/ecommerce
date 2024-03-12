import request from "supertest";
import app from "../../../app";
import {
  createDefaultUser,
  defaultCookie,
  tokenEqualityTest,
} from "../../../test/helpers/user/userHelper";
import { currentUserOutputSchema } from "../../../schemas/userSchema";
import { omit, pick } from "lodash";
import { defaultUser } from "../../../test/helpers/user/userData";
import { createItem } from "../../../test/helpers/item/itemHelper";
import { z } from "zod";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";

const url = "/api/user";
const getRequest = (cookie?: string[]) =>
  request(app)
    .get(url)
    .set("Cookie", cookie ?? [""])
    .send();

it("should return empty object if not logged in", async () => {
  await getRequest()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({});
    });
});

it("empty jwt cookie when using valid token without corresponding user in db", async () => {
  await getRequest(defaultCookie()).expect(200).expect(tokenEqualityTest(""));
});

it("should return user information with correct schema if user is logged in", async () => {
  const user = await createDefaultUser();
  const items = await createItem(new Array(10).fill({ quantity: 5 }));
  user.$add("itemsInCart", items.slice(0, 5), { through: { quantity: 5 } });

  await getRequest(defaultCookie())
    .expect(printedExpect(200))
    .expect(
      validatedExpect(currentUserOutputSchema, (data, res) => {
        expect(pick(data, ["id", "name", "email"])).toEqual(
          omit(defaultUser, ["password"])
        );
        expect(data.cartCount).toBe(5);
      })
    );
});
