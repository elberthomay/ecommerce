import request from "supertest";
import app from "../../../app";
import { z } from "zod";
import {
  getOrdersOutputSchema,
  getOrdersQuery,
} from "../../../schemas/orderSchema";
import {
  createUser,
  defaultCookie,
} from "../../../test/helpers/user/userHelper";
import authenticationTests from "../../../test/authenticationTests.test";
import { defaultUser } from "../../../test/helpers/user/userData";
import { createShop, defaultShop } from "../../../test/helpers/shop/shopHelper";
import Shop from "../../../models/Shop";
import { generateOrders } from "../../../test/helpers/order/orderHelper";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";

const getUserUrl = (shopId: string) => `/api/order/shop/${shopId}`;
const getRequest = (
  shopId: string,
  query: z.input<typeof getOrdersQuery>,
  cookie: string[] = []
) => request(app).get(getUserUrl(shopId)).query(query).set("Cookie", cookie);

beforeEach(async () => {
  await createUser([defaultUser]);
  const [shop] = await createShop([defaultShop]);
});

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, getUserUrl(defaultShop.id!), "get");
});

it("return 403 when not accessed by the shop or admin", async () => {
  const orders = await generateOrders(3);
  await getRequest(orders[0].shopId, {}, defaultCookie())
    .send()
    .expect(printedExpect(403));
});

it("return 10 order(default) when there's 20 orders", async () => {
  await generateOrders(5, undefined, { id: defaultShop.id });
  await generateOrders(5, undefined, { id: defaultShop.id });
  await generateOrders(5, undefined, { id: defaultShop.id });
  await generateOrders(5, undefined, { id: defaultShop.id });

  await getRequest(defaultShop.id!, {}, defaultCookie())
    .send()
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body.length).toBe(10);
    });
});

describe("orders order by createdAt", () => {
  let futureIds: string[];
  let nowIds: string[];
  let pastIds: string[];
  beforeEach(async () => {
    const now = new Date().toISOString();
    const fiveMinutesAgo = new Date(
      new Date().setMinutes(new Date().getMinutes() - 5)
    ).toISOString();
    const twoHundredMsFuture = new Date(
      new Date().setTime(new Date().getTime() + 200)
    ).toISOString();

    const pastOrders = await generateOrders(
      Array(5).fill({
        createdAt: fiveMinutesAgo,
      }),
      undefined,
      { id: defaultShop.id }
    );

    const nowOrders = await generateOrders(
      Array(5).fill({
        createdAt: now,
      }),
      undefined,
      { id: defaultShop.id }
    );
    const futureOrders = await generateOrders(
      Array(5).fill({
        createdAt: twoHundredMsFuture,
      }),
      undefined,
      { id: defaultShop.id }
    );
    nowIds = nowOrders.map((order) => order.id);
    futureIds = futureOrders.map((order) => order.id);
    pastIds = pastOrders.map((order) => order.id);
  });

  it("return 7 order when limit is 7, return ordered by newest first", async () => {
    await getRequest(defaultShop.id!, { limit: "7" }, defaultCookie())
      .send()
      .expect(printedExpect(200))
      .expect(({ body }: { body: z.infer<typeof getOrdersOutputSchema> }) => {
        expect(body.length).toBe(7);
        // first five from nowOrders

        expect(
          body
            .slice(0, 5)
            .every((order) => futureIds.some((id) => order.id === id)),
          "first 5 not from future"
        ).toBe(true);
        expect(
          body
            .slice(5, 7)
            .every((order) => nowIds.some((id) => order.id === id)),
          "first 2 not from now"
        ).toBe(true);
      });
  });

  it("return 7 order when limit is 7, return ordered by oldest first", async () => {
    await getRequest(
      defaultShop.id!,
      { limit: "7", orderBy: "oldest" },
      defaultCookie()
    )
      .send()
      .expect(printedExpect(200))
      .expect(({ body }: { body: z.infer<typeof getOrdersOutputSchema> }) => {
        expect(body.length).toBe(7);
        // first five from nowOrders

        expect(
          body
            .slice(0, 5)
            .every((order) => pastIds.some((id) => order.id === id)),
          "first 5 not from past"
        ).toBe(true);
        expect(
          body
            .slice(5, 7)
            .every((order) => nowIds.some((id) => order.id === id)),
          "first 2 not from now"
        ).toBe(true);
      });
  });
});

it("return 200 format following getOrdersOutputSchema", async () => {
  await generateOrders(5, { id: defaultShop.id }, undefined);
  await getRequest(defaultShop.id!, {}, defaultCookie())
    .send()
    .expect(validatedExpect(getOrdersOutputSchema));
});
