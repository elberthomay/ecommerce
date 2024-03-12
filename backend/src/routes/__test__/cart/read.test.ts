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
import { cartOutputListSchema, cartOutputSchema } from "@elycommerce/common";
import { z } from "zod";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";

const url = "/api/cart";
const getRequest = (cookie: string[]) =>
  request(app).get(url).set("Cookie", cookie);
const getDefaultRequest = () => getRequest(defaultCookie());

describe("require authentication", () => {
  authenticationTests(app, url, "get");
});

beforeEach(async () => {
  await createDefaultUser();
});

it("return empty array if there's no item in cart", async () => {
  await getDefaultRequest()
    .send()
    .expect(printedExpect(200))
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

  await getDefaultRequest()
    .send()
    .expect(printedExpect(200))
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

  await getDefaultRequest()
    .send()
    .expect(printedExpect(200))
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

  const expectedCartItem: z.infer<typeof cartOutputSchema> = {
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

  await getRequest([forgeCookie(otherUser)])
    .send()
    .expect(printedExpect(200))
    .expect(
      validatedExpect(cartOutputListSchema, (data, { body }) => {
        expect(body).toHaveLength(2);
        expect(data[0]).toEqual(expectedCartItem);
        expect(data[1].image).toBe(null);
      })
    );
});

it("return 10 item if there's 10 item in user's cart", async () => {
  const items = await createItem(new Array(10).fill({ quantity: 5 }));

  const user = await User.findOne({ where: { id: defaultUser.id } });
  await user?.$add("itemsInCart", items, { through: { quantity: 5 } });

  await getDefaultRequest()
    .send()
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body).toHaveLength(10);
    });
});
