import request from "supertest";
import { omit } from "lodash";
import authenticationTests from "../../../test/authenticationTests.test";
import app from "../../../app";
import { defaultCookie } from "../../../test/helpers/user/userHelper";
import { createAddress } from "../../../test/helpers/address/addressHelper";
import { createDefaultShop } from "../../../test/helpers/shop/shopHelper";
import { createShop } from "../../../test/helpers/shop/shopHelper";
import Shop from "../../../models/Shop";
import ShopAddress from "../../../models/ShopAddress";
import { addressOutputArraySchema } from "../../../schemas/addressSchema";
import { defaultAddressCreateObject } from "../../../test/helpers/address/addressData";

const url = "/api/address/shop";
const method = "get";
let defaultShop: Shop;
const getDefaultRequest = () =>
  request(app).get(url).set("Cookie", defaultCookie());

describe("passes authentication tests", () => {
  authenticationTests(app, url, method);
});
beforeEach(async () => {
  defaultShop = (await createDefaultShop())[0];
});

it("return [] when there's no address in user's shop", async () => {
  const [shop] = await createShop(1);
  await createAddress(5, shop);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toEqual([]));
});

it("return 5 addresses when there's 5 address in user's shop", async () => {
  const [shop] = await createShop(1);

  await createAddress(5, shop);
  await createAddress(5, defaultShop);
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => expect(body).toHaveLength(5));
});

it("return selected address first, followed by the rest ordered descending by last updated", async () => {
  const addresses = await createAddress(5, defaultShop);
  await Promise.all(
    addresses.map((address) => address.reload({ include: ShopAddress }))
  );
  await addresses[0].shopAddress?.update({ selected: false });
  await new Promise((resolve) => setTimeout(resolve, 100)); //wait 100ms

  await addresses[2].update({ postCode: "94838" });
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(5);
      expect(body[4].id).toBe(addresses[0].id);
      expect(body[0].id).toBe(addresses[2].id);
    });
});

it("return address with required schema", async () => {
  await createAddress(5, defaultShop);
  //check if undefined return follow schema
  await createAddress(
    [{ ...omit(defaultAddressCreateObject, ["longitude", "latitude"]) }],
    defaultShop
  );
  await getDefaultRequest()
    .send()
    .expect(200)
    .expect(({ body }) => {
      const validationResult = addressOutputArraySchema.safeParse(body);
      expect(validationResult.success).toBe(true);
    });
});
