import request from "supertest";
import app from "../../../app";
import Order from "../../../models/Order";
import { defaultUser as defaultUserData } from "../../../test/helpers/user/userData";
import User from "../../../models/User";
import Shop from "../../../models/Shop";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import { createShop } from "../../../test/helpers/shop/shopHelper";
import { generateOrders } from "../../../test/helpers/order/orderHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import { faker } from "@faker-js/faker";
import { invalidUuid } from "../../../test/helpers/commonData";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";
import {
  formatOrderDetail,
  getOrderDetailOutputSchema,
} from "@elycommerce/common";
import { z } from "zod";

const getUrl = (orderId: string) => `/api/order/${orderId}`;

const getRequest = (url: string, cookie: string[]) =>
  request(app).get(url).set("Cookie", cookie);

let defaultUser: User;
let defaultShop: Shop;
let defaultOrder: Order;

const defaultOrderId = faker.string.uuid();

beforeEach(async () => {
  try {
    defaultUser = (await createUser([defaultUserData])).users[0];
    defaultShop = (await createShop(1))[0];
    defaultOrder = (
      await generateOrders(
        [
          {
            id: defaultOrderId,
            items: Array(5)
              .fill(undefined)
              .map((_) => ({ images: 5 })),
          },
        ],
        { id: defaultUser.id },
        { id: defaultShop.id }
      )
    )[0];
    defaultOrder.shop = defaultShop;
  } catch (e) {
    console.log(e);
  }
});

describe("passes authentication test", () => {
  authenticationTests(app, getUrl(defaultOrderId), "get");
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

  const [anotherShop] = await createShop(1);

  //other user
  await getRequest(getUrl(defaultOrderId), [forgeCookie(anotherUser)])
    .send()
    .expect(printedExpect(403));

  //other shop
  await getRequest(getUrl(defaultOrderId), [
    forgeCookie({ id: anotherShop.userId }),
  ])
    .send()
    .expect(printedExpect(403));
});

it("return 200 when accessed by admin, seller or buyer", async () => {
  const {
    users: [root, admin],
  } = await createUser([{ privilege: 0 }, { privilege: 1 }]);

  //default user
  await getRequest(getUrl(defaultOrderId), defaultCookie())
    .send()
    .expect(printedExpect(200));

  //default shop
  await getRequest(getUrl(defaultOrderId), [
    forgeCookie({ id: defaultShop.userId }),
  ])
    .send()
    .expect(printedExpect(200));

  //root
  await getRequest(getUrl(defaultOrderId), [forgeCookie(root)])
    .send()
    .expect(printedExpect(200));
  //admin
  await getRequest(getUrl(defaultOrderId), [forgeCookie(admin)])
    .send()
    .expect(printedExpect(200));
});

it("return correct data and format", async () => {
  //create a few more orders
  await generateOrders(3, { id: defaultUser.id }, { id: defaultShop.id });

  const expectedResult = formatOrderDetail.parse(defaultOrder);
  await getRequest(getUrl(defaultOrderId), defaultCookie())
    .send()
    .expect(printedExpect(200))
    .expect(
      validatedExpect(getOrderDetailOutputSchema, (data) => {
        expect(data).toEqual(expectedResult);
      })
    );
});
