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

const url = "/api/order/";
const method = "post";

describe("return 401 on failed authentication", () => {
  authenticationTests(app, url, method);
});
beforeEach(async () => await createDefaultUser());

it("return 204 when cart is empty or no item is selected", async () => {
  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(204);

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

  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(204);
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

  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(422);
});

it("return 200 when order is successful, delete all selected item in cart, decrement inventory by the cart amount", async () => {
  //create items and one of them to cart with quantity more than inventory
  const selectedItems = (await createItem(5)).filter(
    (item) => item.quantity > 1
  );
  await Cart.bulkCreate(
    selectedItems.map((item) => ({
      itemId: item.id,
      userId: defaultUser.id,
      selected: true,
      quantity: item.quantity - 2,
    }))
  );
  const unselectedItems = (await createItem(2)).filter(
    (item) => item.quantity > 0
  );
  await Cart.bulkCreate(
    unselectedItems.map((item) => ({
      itemId: item.id,
      userId: defaultUser.id,
      selected: false,
      quantity: item.quantity,
    }))
  );

  await request(app)
    .post(url)
    .set("Cookie", defaultCookie())
    .send()
    .expect(200);

  //all cart entry with selected item destroyed
  const newCarts = await Cart.findAll({ where: { userId: defaultUser.id } });
  expect(newCarts).toHaveLength(2);

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

it("kept integrity by failing one order when order race condition occur", async () => {
  //create 5 item, filter out item with quantity less than 2
  const selectedItems = (await createItem(5)).filter(
    (item) => item.quantity > 1
  );

  //create 5 users and put all items to their carts
  const { users } = await createUser([defaultUser, {}, {}, {}, {}]);

  await Promise.all(
    users.map(async (user) => {
      await Cart.bulkCreate(
        selectedItems.map((item) => ({
          itemId: item.id,
          userId: user.id,
          selected: true,
          quantity: item.quantity - 2,
        }))
      );
    })
  );

  // create request objects
  const requests = users.map((user) =>
    request(app).post(url).set("Cookie", forgeCookie(user))
  );

  //send them all
  const results = await Promise.all(requests.map((request) => request.send()));

  const successArray = results.map((result) => result.statusCode);

  //count successes
  const successCount = results.reduce((successCount, response, index) => {
    if (response.statusCode === 200) {
      //deleting successful user from users
      users.splice(index, 1);
      return successCount + 1;
    } else return successCount;
  }, 0);

  //only 1 succeed
  expect(successCount).toEqual(1);

  // all selected item's inventory reduced only by 1 order
  await Promise.all(
    selectedItems.map(async (item) => {
      await item.reload();
      expect(item.quantity).toEqual(2);
    })
  );

  await Promise.all(
    users.map(async (user) => {
      const cart = await Cart.findAll({
        where: { userId: user.id, selected: true },
      });
      expect(cart).toHaveLength(5);
      return cart;
    })
  );
});
