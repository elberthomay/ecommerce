import request from "supertest";
import app from "../../../app";
import {
  createDefaultUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import { currentUserOutputSchema } from "../../../schemas.ts/userSchema";
import { omit, pick } from "lodash";
import { CurrentUserOutputType } from "../../../types/userTypes";
import { defaultUser } from "../../../test/helpers/user/userData";
import { createItem } from "../../../test/helpers/item/itemHelper";

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

it("should return user information with correct schema if user is logged in", async () => {
  const user = await createDefaultUser();
  const items = await createItem(new Array(10).fill({ quantity: 5 }));
  user.$add("itemsInCart", items.slice(0, 5), { through: { quantity: 5 } });

  await getRequest(defaultCookie())
    .expect(200)
    .expect(({ body }: { body: CurrentUserOutputType }) => {
      const { value, error } = currentUserOutputSchema.validate(body);
      expect(error).toBe(undefined);
      expect(pick(body, ["id", "name", "email"])).toEqual(
        omit(defaultUser, ["password"])
      );
      expect(body.cartCount).toEqual(5);
    });
});
