import Joi from "joi";
import { itemSchema } from "./itemSchema";
import { userSchema } from "./userSchema";

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
