import request from "supertest";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import {
  createDefaultUser,
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { defaultUser } from "../../../test/helpers/user/userData";
import User from "../../../models/User";
import _ from "lodash";
import { createItem } from "../../../test/helpers/item/itemHelper";
import Cart from "../../../models/Cart";
import { faker } from "@faker-js/faker";
import { cartOutputSchema } from "../../../schemas.ts/cartSchema";

const url = "/api/cart";

describe("require authentication", () => {
  authenticationTests(app, url, "get");
});

beforeEach(async () => {
  await createDefaultUser();
});

it("return empty array if there's no item in cart", async () => {
  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual([]);
    });
});
it("return empty array if there's no item in user's cart", async () => {
  const items = await createItem(new Array(5).fill({ quantity: 5 }));
  const {
    users: [user],
  } = await createUser(1);
  user.$add("itemsInCart", items, { through: { quantity: 5 } });

  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual([]);
    });
});
it("return one item with cart data if there's 1 item user's cart", async () => {
  const items = await createItem(new Array(5).fill({ quantity: 5 }));
  const {
    users: [otherUser],
  } = await createUser(1);
  await otherUser.$add("itemsInCart", items, { through: { quantity: 5 } });

  const user = await User.findByPk(defaultUser.id);
  await Cart.create({ userId: defaultUser.id, itemId: items[0].id });

  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(_.pick(body[0], ["itemId", "quantity"])).toEqual({
        itemId: items[0].id,
        quantity: 1,
      });
    });
});

it("return cart item with determined schema, with correct data", async () => {
  const {
    users: [otherUser],
  } = await createUser(1);

  const partialShopData = {
    id: faker.string.uuid(),
    name: faker.company.name(),
  };
  const [item] = await createItem(1, partialShopData);

  await otherUser.$add("itemsInCart", item, { through: { quantity: 5 } });

  // const user = await User.findByPk(defaultUser.id);
  // await Cart.create({ userId: defaultUser.id, itemId: items[0].id });

  const expectedCartItem = {
    inventory: item.quantity,
    itemId: item.id,
    name: item.name,
    price: item.price,
    quantity: 5,
    selected: true,
    shopId: partialShopData.id,
    shopName: partialShopData.name,
  };

  await request(app)
    .get(url)
    .set("Cookie", forgeCookie(otherUser))
    .send()
    .expect(200)
    .expect(({ body }) => {
      console.log(body);
      expect(body).toHaveLength(1);
      expect(cartOutputSchema.validateAsync(body[0])).resolves;
      expect(_.isEqual(body[0], expectedCartItem)).toBeTruthy();
    });
});

it("return 10 item if there's 10 item in user's cart", async () => {
  const items = await createItem(new Array(10).fill({ quantity: 5 }));

  const user = await User.findOne({ where: { id: defaultUser.id } });
  await user?.$add("itemsInCart", items, { through: { quantity: 5 } });

  await request(app)
    .get(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(10);
    });
});
