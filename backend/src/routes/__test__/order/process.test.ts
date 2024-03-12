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
import { createItem } from "../../../test/helpers/item/itemHelper";
import Cart from "../../../models/Cart";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import { printedExpect } from "../../../test/helpers/assertionHelper";
import { z } from "zod";
import { formatGetOrders } from "@elycommerce/common";
import {
  setCancelOrderTimeout,
  setDeliverOrder,
} from "../../../agenda/orderAgenda";
import { OrderStatuses } from "@elycommerce/common";
import { AWAITING_CONFIRMATION_TIMEOUT_MINUTE } from "../../../var/constants";

const url = "/api/order/process";
const method = "post";

const getRequest = (cookie: string[]) =>
  request(app).post(url).set("Cookie", cookie);

describe("return 401 on failed authentication", () => {
  authenticationTests(app, url, method);
});

beforeEach(async () => {
  const {
    users: [user],
  } = await createUser([{ id: defaultUser.id }]);
  const [address] = await createAddress(1, user);
  await user.update({ selectedAddressId: address.id });
  (setCancelOrderTimeout as jest.Mock).mockClear();
  (setDeliverOrder as jest.Mock).mockClear();
});

it("return 422 when cart is empty or no item is selected", async () => {
  await getRequest(defaultCookie()).send().expect(422);

  //create items and insert them to default user's cart, all unselected
  const items = (await createItem(5)).filter((item) => item.quantity > 0);
  await Cart.bulkCreate(
    items.map((item) => ({
      itemId: item.id,
      userId: defaultUser.id,
      selected: false,
      quantity: item.quantity,
    }))
  );

  await getRequest(defaultCookie()).send().expect(422);
});

it("return 422 when quantity in cart is more than inventory", async () => {
  //create items and one of them to cart with quantity more than inventory
  const items = (await createItem(5)).filter((item) => item.quantity > 0);
  await Cart.create({
    itemId: items[0].id,
    userId: defaultUser.id,
    selected: true,
    quantity: items[0].quantity + 1,
  });

  await getRequest(defaultCookie()).send().expect(422);
});

it("return 200 when order is successful, delete all selected item in cart, decrement inventory by the cart amount, schedule timeout", async () => {
  const shopCount = 3;
  //create items with random quantity
  const itemsByShop = await Promise.all(
    Array.from({ length: shopCount }).map((_) =>
      createItem(
        Array.from({ length: 15 }).map((_) => ({
          quantity: Math.floor(Math.random() * 10 + 3),
        }))
      )
    )
  );

  const selectedItems = itemsByShop.map((items) => items.slice(0, 10)).flat();
  const unselectedItems = itemsByShop.map((items) => items.slice(10)).flat();

  await Cart.bulkCreate(
    selectedItems
      .map((item) => ({
        itemId: item.id,
        userId: defaultUser.id,
        selected: true,
        quantity: item.quantity - 2,
      }))
      .concat(
        unselectedItems.map((item) => ({
          itemId: item.id,
          userId: defaultUser.id,
          selected: false,
          quantity: item.quantity - 2,
        }))
      )
  );

  await getRequest(defaultCookie())
    .send()
    .expect(printedExpect(200))
    .expect(({ body }: { body: z.infer<typeof formatGetOrders> }) => {
      expect(body).toHaveLength(shopCount);
      expect(setCancelOrderTimeout).toHaveBeenCalledTimes(body.length);

      (setCancelOrderTimeout as jest.Mock).mock.calls.forEach((argument) => {
        const [orderId, timeout, initialStatus] = argument;
        const order = body.find(({ id }) => id === orderId);

        expect(order).not.toBeUndefined();
        expect(initialStatus).toBe(OrderStatuses.AWAITING);
        if (order) {
          const expectedTimeout = new Date(
            new Date(order.createdAt).setMinutes(
              new Date(order.createdAt).getMinutes() +
                AWAITING_CONFIRMATION_TIMEOUT_MINUTE
            )
          );
          expect(timeout).toEqual(expectedTimeout);
        }
      });
    });

  //all selected cart entry destroyed
  const newCarts = await Cart.findAll({ where: { userId: defaultUser.id } });
  expect(newCarts).toHaveLength(unselectedItems.length);

  // all selected item's inventory reduced
  await Promise.all(
    selectedItems.map(async (item) => {
      await item.reload();
      expect(item.quantity).toEqual(2);
    })
  );

  // all unselected item's inventory stays the same
  await Promise.all(
    unselectedItems.map(async (item) => {
      const originalQuantity = item.quantity;
      await item.reload();
      expect(item.quantity).toEqual(originalQuantity);
    })
  );
});

it("kept integrity by failing orders when order race condition occur", async () => {
  //create item with quantity 2
  const [limitedEdition] = await createItem([{ quantity: 3 }]);

  //create 10 users and address and put item to their carts
  const { users } = await createUser(10);
  await Promise.all(
    users.map(async (user) => {
      const [address] = await createAddress(1, user);
      await user.update({ selectedAddressId: address.id });
    })
  );

  //limited edition item to cart of all users
  await Cart.bulkCreate(
    users
      .map((user) => [
        {
          itemId: limitedEdition.id,
          userId: user.id,
          selected: true,
          quantity: 1,
        },
      ])
      .flat()
  );

  //send all process request and extract the status code
  const results = (
    await Promise.all(
      users.map((user) => getRequest([forgeCookie(user)]).send())
    )
  ).map(({ statusCode }) => statusCode);

  // only 3 succeed
  expect(results.reduce((sum, code) => sum + Number(code === 200), 0)).toBe(3);

  // the rest should receive out of stock error
  expect(results.reduce((sum, code) => sum + Number(code === 422), 0)).toBe(7);

  // item should be out of stock
  expect((await limitedEdition.reload()).quantity).toBe(0);
});

it("kept integrity by correctly subtracting quantity when order race condition occur", async () => {
  const initialItemCount = 200;
  //create item with quantity 20
  const [commonItem] = await createItem([{ quantity: initialItemCount }]);

  //create 10 users and put item to their carts
  const { users } = await createUser(10);
  await Promise.all(
    users.map(async (user) => {
      const [address] = await createAddress(1, user);
      await user.update({ selectedAddressId: address.id });
    })
  );

  //limited edition item to cart of all users
  const carts = await Cart.bulkCreate(
    users
      .map((user, i) => [
        {
          itemId: commonItem.id,
          userId: user.id,
          selected: true,
          quantity: 2 + i,
        },
      ])
      .flat()
  );

  const totalQuantity = carts.reduce((sum, { quantity }) => sum + quantity, 0);

  //send all process request and extract the status code
  const results = (
    await Promise.all(
      users.map((user) => getRequest([forgeCookie(user)]).send())
    )
  ).map(({ statusCode }) => statusCode);

  // all succeed
  expect(results.reduce((sum, code) => sum + Number(code === 200), 0)).toBe(
    results.length
  );

  // item quantity should be decremented properly
  expect((await commonItem.reload()).quantity).toBe(
    initialItemCount - totalQuantity
  );
});
