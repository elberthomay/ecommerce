import { z } from "zod";
import { defaultItem } from "./itemHelper";
import { pick } from "lodash";
import { itemCreateSchema } from "../../../schemas/itemSchema";
import { invalidTagIds } from "../Tag/tagData";

export const invalidItemValues = {
  name: ["", 10, "a".repeat(256)],
  description: ["", 10, "a".repeat(2001)],
  price: ["fsf", -100000, 1000000001],
  quantity: ["string", -7, 10000],
  tags: invalidTagIds,
};

export const defaultCreateItem: z.infer<typeof itemCreateSchema> = pick(
  defaultItem,
  ["name", "description", "price", "quantity"]
);
