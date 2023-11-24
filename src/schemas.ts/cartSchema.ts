import Joi from "joi";
import { itemSchema } from "./itemSchema";
import { userSchema } from "./userSchema";
import { cartOutputType } from "../types/cartType";
import { shopSchema } from "./shopSchema";

export const cartSchema = {
  userId: userSchema.id,
  itemId: itemSchema.id,
  quantity: itemSchema.quantity,
  selected: Joi.boolean(),
};

export const cartCreateSchema = Joi.object({
  itemId: cartSchema.itemId.required(),
  quantity: cartSchema.quantity.min(1).default(1),
  selected: cartSchema.selected.default(true),
})
  .required()
  .unknown(false);

export const cartUpdateSchema = Joi.object({
  itemId: cartSchema.itemId.required(),
  quantity: cartSchema.quantity.optional(),
  selected: cartSchema.selected.optional(),
})
  .required()
  .unknown(false)
  .min(2);

export const cartDeleteSchema = Joi.object({
  itemId: cartSchema.itemId.required(),
})
  .required()
  .unknown(false);

export const cartOutputSchema = Joi.object<cartOutputType>({
  inventory: itemSchema.quantity.required(),
  itemId: itemSchema.id.required(),
  name: itemSchema.name.required(),
  price: itemSchema.price.required(),
  quantity: cartSchema.quantity.required(),
  selected: cartSchema.selected.required(),
  shopId: shopSchema.id.required(),
  shopName: shopSchema.name.required(),
})
  .required()
  .unknown(false);
