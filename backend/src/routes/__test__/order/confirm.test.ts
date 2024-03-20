import request from "supertest";
import app from "../../../app";
import Order from "../../../models/Order";
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
import { formatOrder, orderOutputSchema } from "@elycommerce/common";
import { setCancelOrderTimeout } from "../../../agenda/orderAgenda";
import { addMinutes, differenceInMilliseconds } from "date-fns";
import { CONFIRMED_TIMEOUT_MINUTE } from "../../../var/constants";
import { omit } from "lodash";

const getUrl = (orderId: string) => `/api/order/${orderId}/confirm`;

const getRequest = (url: string, cookie: string[]) =>
  request(app).post(url).set("Cookie", cookie);

const defaultOrderId = faker.string.uuid();

let defaultOrder: Order;
let defaultUser: User;
let defaultShop: Shop;

beforeEach(async () => {
  defaultUser = (await createUser([defaultUserData])).users[0];
  defaultShop = (await createShop(1))[0];
  defaultOrder = (
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
    )
  )[0];
  (setCancelOrderTimeout as jest.Mock).mockClear();
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

it("return 403 when not accessed by admin, or seller", async () => {
  const {
    users: [anotherUser],
  } = await createUser(1);

  //other user
  await getRequest(getUrl(defaultOrderId), [forgeCookie(anotherUser)])
    .send()
    .expect(printedExpect(403));

  //the buyer
  await getRequest(getUrl(defaultOrderId), defaultCookie())
    .send()
    .expect(printedExpect(403));
});

it("return 409 when current status is not awaiting confirmation", async () => {
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

it("return 200 with correct data and format", async () => {
  defaultOrder.shop = defaultShop;
  defaultOrder.status = OrderStatuses.CONFIRMED;
  const expectedResult = {
    ...JSON.parse(JSON.stringify(formatOrder.parse(defaultOrder))),
  };
  await getRequest(getUrl(defaultOrderId), [
    forgeCookie({ id: defaultShop.userId }),
  ])
    .expect(printedExpect(200))
    .expect(
      validatedExpect(orderOutputSchema, (data, res) => {
        expect(omit(data, ["timeout"])).toEqual(
          omit(expectedResult, ["timeout"])
        );
        expect(setCancelOrderTimeout).toHaveBeenCalledTimes(1);
        const [orderId, timeout, status] = (setCancelOrderTimeout as jest.Mock)
          .mock.calls[0];
        expect(orderId).toBe(data.id);
        expect(data?.timeout).not.toBeUndefined();

        expect(
          differenceInMilliseconds(
            timeout,
            addMinutes(new Date(data.updatedAt), CONFIRMED_TIMEOUT_MINUTE)
          ) < 1000
        ).toBe(true);
        expect(status).toBe(OrderStatuses.CONFIRMED);
      })
    );
});
