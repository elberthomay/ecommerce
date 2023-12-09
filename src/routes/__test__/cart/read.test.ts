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
import { cartOutputType } from "../../../types/cartType";
import Joi from "joi";

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
  const [item, itemWithNoPicture] = await createItem(2, partialShopData);
  const imageArray = Array(5)
    .fill(null)
    .map((image, i) => ({ imageName: `image${i}.webp`, order: i }));
  await Promise.all(imageArray.map((img) => item.$create("image", img)));

  await otherUser.$add("itemsInCart", itemWithNoPicture, {
    through: { quantity: 5 },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await otherUser.$add("itemsInCart", item, { through: { quantity: 5 } });

  // const user = await User.findByPk(defaultUser.id);
  // await Cart.create({ userId: defaultUser.id, itemId: items[0].id });

  const expectedCartItem = {
    inventory: item.quantity,
    itemId: item.id,
    name: item.name,
    price: item.price,
    quantity: 5,
    image: "image0.webp",
    selected: true,
    shopId: partialShopData.id,
    shopName: partialShopData.name,
  };

  await request(app)
    .get(url)
    .set("Cookie", forgeCookie(otherUser))
    .send()
    .expect(200)
    .expect(({ body }: { body: cartOutputType[] }) => {
      expect(body).toHaveLength(2);
      const errors = body.reduce((errors, cart) => {
        const { value, error } = cartOutputSchema.validate(cart);
        if (error) return [...errors, error];
        else return errors;
      }, [] as Joi.ValidationError[]);
      console.log(JSON.stringify(body[0]));
      expect(errors).toHaveLength(0);
      expect(body[0]).toEqual(expectedCartItem);
      expect(body[1].image).toBe(null);
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
