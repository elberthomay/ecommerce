import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import Order from "../../../models/Order";
import OrderItem from "../../../models/OrderItem";
import User from "../../../models/User";
import Shop from "../../../models/Shop";
import { invalidUuid } from "../../../test/helpers/commonData";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { createShop } from "../../../test/helpers/shop/shopHelper";
import { generateOrders } from "../../../test/helpers/order/orderHelper";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";
import { faker } from "@faker-js/faker";
import { formatOrderItem, orderItemOutputSchema } from "@elycommerce/common";
import { defaultUser as defaultUserData } from "../../../test/helpers/user/userData";
import { z } from "zod";

const getUrl = (orderId: string, itemId: string) =>
  `/api/order/${orderId}/item/${itemId}`;

const defaultOrderId = faker.string.uuid();
const defaultOrderItemId = faker.string.uuid();

let defaultUser: User;
let defaultShop: Shop;
let defaultOrder: Order;
let defaultOrderItem: OrderItem;

const getRequest = (url: string, cookie: string[]) =>
  request(app).get(url).set("Cookie", cookie);

beforeEach(async () => {
  defaultUser = (await createUser([{ id: defaultUserData.id }])).users[0];
  defaultShop = (await createShop(1))[0];
  defaultOrder = (
    await generateOrders(
      [{ id: defaultOrderId, items: [{ id: defaultOrderItemId }] }],
      { id: defaultUser.id },
      { id: defaultShop.id }
    )
  )[0];
  defaultOrderItem = defaultOrder.items[0];
});

describe("pass authentication test", () => {
  authenticationTests(app, getUrl(defaultOrderId, defaultOrderItemId), "get");
});

it("return 400 from invalid orderId or itemId", async () => {
  await Promise.all(
    invalidUuid.map(async (uuid) => {
      await getRequest(
        getUrl(uuid, defaultOrderItem.id),
        defaultCookie()
      ).expect(printedExpect(400));
      await getRequest(getUrl(defaultOrder.id, uuid), defaultCookie()).expect(
        printedExpect(400)
      );
    })
  );
});

it("return 403 when accessed not by admin, buyer or seller", async () => {
  const {
    users: [anotherUser],
  } = await createUser(1);
  const [shop] = await createShop(1);

  await getRequest(getUrl(defaultOrder.id, defaultOrderItem.id), [
    forgeCookie(anotherUser),
  ]).expect(printedExpect(403));

  await getRequest(getUrl(defaultOrder.id, defaultOrderItem.id), [
    forgeCookie({ id: shop.userId }),
  ]).expect(printedExpect(403));
});

it("return 404 if order does not exist", async () => {
  await getRequest(getUrl(faker.string.uuid(), defaultOrderItem.id), [
    forgeCookie(defaultUser),
  ]).expect(printedExpect(404));
});

it("return 404 if item does not exist in order", async () => {
  await getRequest(getUrl(defaultOrder.id, faker.string.uuid()), [
    forgeCookie(defaultUser),
  ]).expect(printedExpect(404));
});

it("return 200 accessed by admin", async () => {
  const {
    users: [root, admin],
  } = await createUser([{ privilege: 0 }, { privilege: 1 }]);

  await getRequest(getUrl(defaultOrder.id, defaultOrderItem.id), [
    forgeCookie(root),
  ]).expect(printedExpect(200));

  await getRequest(getUrl(defaultOrder.id, defaultOrderItem.id), [
    forgeCookie(admin),
  ]).expect(printedExpect(200));
});

it("return 200 accessed by buyer", async () => {
  await getRequest(getUrl(defaultOrder.id, defaultOrderItem.id), [
    forgeCookie(defaultUser),
  ]).expect(printedExpect(200));
});

it("return 200 accessed by seller", async () => {
  await getRequest(getUrl(defaultOrder.id, defaultOrderItem.id), [
    forgeCookie({ id: defaultShop.userId }),
  ]).expect(printedExpect(200));
});

it("return 200 with correct item and correct format", async () => {
  // create multiple order each with multiple item
  const orders = await generateOrders(
    Array.from({ length: 5 }).map((_) => ({ items: 5 })),
    { id: defaultUser.id },
    { id: defaultShop.id }
  );

  //select 1 item
  const orderIndex = Math.floor(Math.random() * orders.length);
  const itemIndex = Math.floor(Math.random() * orders[0].items.length);
  const selectedItem = orders[orderIndex].items[itemIndex];
  selectedItem.order = orders[orderIndex];
  await selectedItem.order.reload({ include: [Shop] });

  const expectedResult = formatOrderItem.parse(selectedItem);
  await getRequest(
    getUrl(selectedItem.orderId, selectedItem.id),
    defaultCookie()
  )
    .expect(printedExpect(200))
    .expect(
      validatedExpect(orderItemOutputSchema, (data, res) => {
        expect(data).toEqual(expectedResult);
      })
    )
    .expect(({ body }: { body: z.infer<typeof orderItemOutputSchema> }) => {
      const sortedImageByOrder = [...body.images].sort(
        (a, b) => a.order - b.order
      );
      expect(body.images, "images not sorted by order").toEqual(
        sortedImageByOrder
      );
    });
});
