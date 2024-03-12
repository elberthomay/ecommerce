import { ShopCreationAttribute } from "../../../models/Shop";

export const invalidShopValue = {
  name: [
    "",
    "a", // less than 5 character
    "aa",
    "aaa",
    "aaaa",
    "-9 ballpatterm", //start with non alphanum
    "big and small ^knick knack", //contain symbol other than - , or _
    "a".repeat(256), //more than 255 character
  ],
  description: ["a".repeat(1001)],
};
