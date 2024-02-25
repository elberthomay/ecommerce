import request from "supertest";
import app from "../../../app";
import authenticationTests from "../../../test/authenticationTests.test";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import {
  defaultAddressCreateObject,
  invalidAddressValues,
} from "../../../test/helpers/address/addressData";
import { defaultCookie } from "../../../test/helpers/user/userHelper";
import { omit, pick } from "lodash";
import validationTest from "../../../test/helpers/validationTest.test";
import Shop from "../../../models/Shop";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";
import {
  addressCreateSchema,
  addressOutputSchema,
} from "../../../schemas/addressSchema";
import { z } from "zod";

const url = "/api/address/shop";
const method = "post";
let defaultShop: Shop;

const getDefaultRequest = () =>
  request(app).post(url).set("Cookie", defaultCookie());

beforeEach(async () => {
  defaultShop = (await createDefaultShop())[0];
});

describe("passes authentication test", () => {
  authenticationTests(app, url, method);
});

it("return 400 for invalid address creation data", async () => {
  await validationTest<z.input<typeof addressCreateSchema>>(
    getDefaultRequest,
    defaultAddressCreateObject,
    invalidAddressValues
  );
});

it("return 409 if address exceed limit", async () => {
  await createAddress(20, defaultShop);
  await getDefaultRequest().send(defaultAddressCreateObject).expect(409);
});

it("return 404 if authenticated user has no shop", async () => {
  await defaultShop?.destroy();
  await getDefaultRequest().send(defaultAddressCreateObject).expect(404);
});

it("successfuly create new address for shop", async () => {
  await createAddress(5, defaultShop);

  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(201)
    .expect(({ body }: { body: z.infer<typeof addressOutputSchema> }) => {
      expect(omit(body, ["id", "selected", "subdistrictId"])).toEqual(
        defaultAddressCreateObject
      );
    });

  const addresses = await defaultShop?.$get("addresses");
  expect(addresses).toHaveLength(6);
});

it("return address with required schema", async () => {
  await getDefaultRequest()
    .send(defaultAddressCreateObject)
    .expect(201)
    .expect(({ body }) => {
      const validationResult = addressOutputSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
    });
});
