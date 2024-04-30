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
import {
  fullGenerateOrderData,
  generateOrders,
} from "../../../test/helpers/order/orderHelper";
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
import { omit } from "lodash";
import TempOrderItem from "../../../models/temp/TempOrderItem";
import OrderOrderItem from "../../../models/temp/OrderOrderItem";
import TempOrderItemImage from "../../../models/temp/TempOrderItemImage";
import { getOrderDetailQuery } from "../../../kysely/queries/orderQueries";

const getUrl = (orderId: string) => `/api/order/${orderId}`;

const getRequest = (url: string, cookie: string[]) =>
  request(app).get(url).set("Cookie", cookie).send();

let defaultUser: User;
let defaultShop: Shop;

const defaultOrderId = faker.string.uuid();

beforeEach(async () => {
  try {
    defaultUser = (await createUser([defaultUserData])).users[0];
    defaultShop = (await createShop(1))[0];
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
    );
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
        await getRequest(getUrl(uuid), defaultCookie()).expect(
          printedExpect(400)
        )
    )
  );
});

it("return 404 if order doesn't exist", async () => {
  await getRequest(getUrl(faker.string.uuid()), defaultCookie()).expect(
    printedExpect(404)
  );
});

it("return 403 when not accessed by admin, seller or buyer", async () => {
  const {
    users: [anotherUser],
  } = await createUser(1);

  const [anotherShop] = await createShop(1);

  //other user
  await getRequest(getUrl(defaultOrderId), [forgeCookie(anotherUser)]).expect(
    printedExpect(403)
  );

  //other shop
  await getRequest(getUrl(defaultOrderId), [
    forgeCookie({ id: anotherShop.userId }),
  ]).expect(printedExpect(403));
});

it("return 200 when accessed by admin, seller or buyer", async () => {
  const {
    users: [root, admin],
  } = await createUser([{ privilege: 0 }, { privilege: 1 }]);

  //default user
  await getRequest(getUrl(defaultOrderId), defaultCookie()).expect(
    printedExpect(200)
  );

  //default shop
  await getRequest(getUrl(defaultOrderId), [
    forgeCookie({ id: defaultShop.userId }),
  ]).expect(printedExpect(200));

  //root
  await getRequest(getUrl(defaultOrderId), [forgeCookie(root)]).expect(
    printedExpect(200)
  );
  //admin
  await getRequest(getUrl(defaultOrderId), [forgeCookie(admin)]).expect(
    printedExpect(200)
  );
});

it("return correct data and format", async () => {
  //create a few more orders
  await generateOrders(3, { id: defaultUser.id }, { id: defaultShop.id });

  const expectedResult = await getOrderDetailQuery(
    defaultOrderId
  ).executeTakeFirstOrThrow();

  await getRequest(getUrl(defaultOrderId), defaultCookie())
    .expect(printedExpect(200))
    .expect(
      validatedExpect(getOrderDetailOutputSchema, async (data) => {
        expect(omit(data, ["timeout"])).toEqual(
          JSON.parse(
            JSON.stringify({
              ...expectedResult,
              latitude: Number(expectedResult.latitude),
              longitude: Number(expectedResult.longitude),
            })
          )
        );
      })
    );
});

describe("successfuly fetch order with item in new table", () => {
  let fullOrder: Awaited<ReturnType<typeof generateOrders>>;
  beforeEach(async () => {
    fullOrder = await generateOrders(
      [
        {
          items: Array(5)
            .fill(null)
            .map((_) => ({ images: 3 })),
        },
      ],
      { id: defaultUser.id },
      { id: defaultShop.id }
    );
  });

  it("returns 200 and return order in correct format", async () => {
    await getRequest(getUrl(fullOrder[0].id), defaultCookie())
      .expect(printedExpect(200))
      .expect(validatedExpect(getOrderDetailOutputSchema));
  });

  it("returns 200 and correct item and images", async () => {
    await getRequest(getUrl(fullOrder[0].id), defaultCookie())
      .expect(200)
      .expect(
        ({ body }: { body: z.infer<typeof getOrderDetailOutputSchema> }) => {
          const receivedItems = body.items;

          // returned order should already be sorted
          const sortedItems = fullOrder[0].items;

          expect(receivedItems.length).toBe(sortedItems.length);
          sortedItems.map((item, i) => {
            expect(receivedItems[i]?.id).toBe(item.id);
            expect(receivedItems[i]?.image).toBe(item.images[0].imageName);
          });
        }
      );
  });
});
