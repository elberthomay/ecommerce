import { ItemCreateType } from "../../../types/itemTypes";
import { defaultItem } from "./itemHelper";
import { pick } from "lodash";

export const invalidNames = ["", 10, "a".repeat(256)];
export const invalidDescription = ["", 10, "a".repeat(2001)];
export const invalidPrice = ["fsf", -100000, 1000000001];
export const invalidQuantity = ["string", -7, 10000];

export const defaultCreateItem: ItemCreateType = pick(defaultItem, [
  "name",
  "description",
  "price",
  "quantity",
]);
