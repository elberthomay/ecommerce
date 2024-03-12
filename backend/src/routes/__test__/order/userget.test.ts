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
import { createShop } from "../../../test/helpers/shop/shopHelper";
import Shop from "../../../models/Shop";
import { generateOrders } from "../../../test/helpers/order/orderHelper";
import {
  printedExpect,
  validatedExpect,
} from "../../../test/helpers/assertionHelper";

const getUserUrl = (userId: string) => `/api/order/user/${userId}`;
const getRequest = (
  userId: string,
  query: z.input<typeof getOrdersQuery>,
  cookie: string[] = []
) => request(app).get(getUserUrl(userId)).query(query).set("Cookie", cookie);
let defaultShop: Shop;

beforeEach(async () => {
  await createUser([defaultUser]);
  const [shop] = await createShop(1);
  defaultShop = shop;
});

describe("should return 401 with failed authentication", () => {
  authenticationTests(app, getUserUrl(defaultUser.id), "get");
});

it("return 403 when not accessed by the user or admin", async () => {
  const orders = await generateOrders(3);
  await getRequest(orders[0].userId, {}, defaultCookie())
    .send()
    .expect(printedExpect(403));
});

it("return 10 order(default) when there's 20 orders", async () => {
  const orders = await generateOrders(20, { id: defaultUser.id }, undefined);
  await getRequest(defaultUser.id, {}, defaultCookie())
    .send()
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body.length).toBe(10);
    });
});

it("return 20 order when there's 20 orders for the user", async () => {
  const orders = await generateOrders(20, { id: defaultUser.id }, undefined);
  await generateOrders(20, undefined, { id: orders[0].shopId });
  await generateOrders(20, undefined, { id: orders[0].shopId });
  await getRequest(defaultUser.id, { limit: "100" }, defaultCookie())
    .send()
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body.length).toBe(20);
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
      { id: defaultUser.id },
      undefined
    );

    const nowOrders = await generateOrders(
      Array(5).fill({
        createdAt: now,
      }),
      { id: defaultUser.id },
      undefined
    );
    const futureOrders = await generateOrders(
      Array(5).fill({
        createdAt: twoHundredMsFuture,
      }),
      { id: defaultUser.id },
      undefined
    );
    nowIds = nowOrders.map((order) => order.id);
    futureIds = futureOrders.map((order) => order.id);
    pastIds = pastOrders.map((order) => order.id);
  });

  it("return 7 order when limit is 7, return ordered by newest first", async () => {
    await getRequest(defaultUser.id, { limit: "7" }, defaultCookie())
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
      defaultUser.id,
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

it("return order newer than certain date when newerThan is used", async () => {
  const threeMonthsAgo = new Date(
    new Date().setMonth(new Date().getMonth() - 3)
  ).toISOString();
  const twoMonthsAgo = new Date(
    new Date().setMonth(new Date().getMonth() - 2)
  ).toISOString();
  const oneMonthAgo = new Date(
    new Date().setMonth(new Date().getMonth() - 1)
  ).toISOString();
  await generateOrders(
    Array(10)
      .fill(undefined)
      .map((_) => ({ createdAt: threeMonthsAgo })),
    { id: defaultUser.id },
    undefined
  );
  await generateOrders(
    Array(10)
      .fill(undefined)
      .map((_) => ({ createdAt: twoMonthsAgo })),
    { id: defaultUser.id },
    undefined
  );
  await generateOrders(
    Array(10)
      .fill(undefined)
      .map((_) => ({ createdAt: oneMonthAgo })),
    { id: defaultUser.id },
    undefined
  );
  await getRequest(
    defaultUser.id,
    { newerThan: oneMonthAgo, limit: "100" },
    defaultCookie()
  )
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body.length).toBe(10);
    });
});

it("return 200 format following getOrdersOutputSchema", async () => {
  await generateOrders(5, { id: defaultUser.id }, undefined);
  await getRequest(defaultUser.id, {}, defaultCookie())
    .send()
    .expect(validatedExpect(getOrdersOutputSchema));
});
