import request from "supertest";
import app from "../../../app";
import { OrderStatuses } from "@elycommerce/common";
import authenticationTests from "../../../test/authenticationTests.test";
import { generateOrders } from "../../../test/helpers/order/orderHelper";
import { faker } from "@faker-js/faker";
import { invalidUuid } from "../../../test/helpers/commonData";
import User from "../../../models/User";
import { defaultUser as defaultUserData } from "../../../test/helpers/user/userData";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";
import Shop from "../../../models/Shop";
import { createShop } from "../../../test/helpers/shop/shopHelper";
import { orderOutputSchema } from "@elycommerce/common";
import {
  getFullOrderQuery,
  getOrderDetailQuery,
  getOrderQuery,
} from "../../../kysely/queries/orderQueries";
import { omit } from "lodash";

const getUrl = (orderId: string) => `/api/order/${orderId}/cancel`;

const getRequest = (url: string, cookie: string[]) =>
  request(app).post(url).set("Cookie", cookie);

const defaultOrderId = faker.string.uuid();

let defaultUser: User;
let defaultShop: Shop;

beforeEach(async () => {
  defaultUser = (await createUser([defaultUserData])).users[0];
  defaultShop = (await createShop(1))[0];
  await generateOrders(
    [
      {
        id: defaultOrderId,
        status: OrderStatuses.AWAITING,
        items: Array.from({ length: 4 }).map((_) => ({ images: 4 })),
      },
    ],
    { id: defaultUser.id },
    { id: defaultShop.id }
  );
});

describe("passes authentication test", () => {
  authenticationTests(app, getUrl(defaultOrderId), "post");
});

it("return 400 if orderId is invalid", async () => {
  await Promise.all(
    invalidUuid.map(
      async (uuid) =>
        await getRequest(getUrl(uuid), defaultCookie())
          .send()
          .expect(printedExpect(400))
    )
  );
});

it("return 404 if order doesn't exist", async () => {
  await getRequest(getUrl(faker.string.uuid()), defaultCookie())
    .send()
    .expect(printedExpect(404));
});

it("return 403 when not accessed by admin, seller or buyer", async () => {
  const {
    users: [anotherUser],
  } = await createUser(1);

  //other user
  await getRequest(getUrl(defaultOrderId), [forgeCookie(anotherUser)])
    .send()
    .expect(printedExpect(403));
});

it("return 409 when current status is not awaiting confirmation or confirmed when request by seller", async () => {
  const orders = await generateOrders(
    Object.values(OrderStatuses).map((status) => ({ status })),
    { id: defaultUser.id },
    { id: defaultShop.id }
  );
  const successOrder = orders.filter(
    (order) =>
      order.status === OrderStatuses.AWAITING ||
      order.status === OrderStatuses.CONFIRMED
  );
  const failureOrder = orders.filter(
    (order) =>
      order.status !== OrderStatuses.AWAITING &&
      order.status !== OrderStatuses.CONFIRMED
  );

  await Promise.all(
    successOrder.map(async ({ id }) => {
      await getRequest(getUrl(id), [
        forgeCookie({ id: defaultShop.userId }),
      ]).expect(printedExpect(200));
    })
  );

  await Promise.all(
    failureOrder.map(async ({ id }) => {
      await getRequest(getUrl(id), [
        forgeCookie({ id: defaultShop.userId }),
      ]).expect(printedExpect(409));
    })
  );
});

it("return 409 when current status is not awaiting confirmation when request by buyer", async () => {
  const orders = await generateOrders(
    Object.values(OrderStatuses).map((status) => ({ status })),
    { id: defaultUser.id },
    { id: defaultShop.id }
  );
  const successOrder = orders.filter(
    (order) => order.status === OrderStatuses.AWAITING
  );
  const failureOrder = orders.filter(
    (order) => order.status !== OrderStatuses.AWAITING
  );

  await Promise.all(
    successOrder.map(async ({ id }) => {
      await getRequest(getUrl(id), defaultCookie()).expect(printedExpect(200));
    })
  );

  await Promise.all(
    failureOrder.map(async ({ id }) => {
      await getRequest(getUrl(id), defaultCookie()).expect(printedExpect(409));
    })
  );
});

it("return 200 with correct data and format", async () => {
  const order = await getOrderQuery(defaultOrderId).executeTakeFirstOrThrow();
  order.status = OrderStatuses.CANCELLED;

  const expectedResult = JSON.parse(JSON.stringify(order));
  await getRequest(getUrl(defaultOrderId), [
    forgeCookie({ id: defaultShop.userId }),
  ])
    .expect(printedExpect(200))
    .expect(
      validatedExpect(orderOutputSchema, (data, res) => {
        expect(data).toEqual({
          ...expectedResult,
          updatedAt: data.updatedAt, //would change, no need to be compared
          latitude: Number(order.latitude),
          longitude: Number(order.longitude),
        });
      })
    );

  const orderAfter = await getOrderQuery(
    defaultOrderId
  ).executeTakeFirstOrThrow();
  expect(omit(order, ["updatedAt"])).toEqual(omit(orderAfter, ["updatedAt"]));
});
