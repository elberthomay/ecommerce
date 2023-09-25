import Joi from "joi";
import {
  ItemCreateType,
  ItemParamType,
  ItemQueryType,
  ItemUpdateType,
} from "../types/itemTypes";
import { paginationSchema, uuidSchema } from "./commonSchema";
import { tagSchema } from "./tagSchema";

export const itemSchema = {
  id: uuidSchema,
  name: Joi.string().max(255).messages({
    "string.max": "{#label} must be shorter than {#limit} characters",
    "any.required": "{#label} is required",
  }),
  description: Joi.string().max(2000).messages({
    "string.max": "{#label} must be shorter than {#limit} characters",
    "any.required": "{#label} is required",
  }),
  price: Joi.number().min(0).max(1000000000).messages({
    "number.max": "{#label} must be less or than or equal Rp.{#limit},00",
    "number.min": "{#label} must be more than or equal Rp.{#limit},00",
    "any.required": "{#label} is required",
  }),
  quantity: Joi.number().min(0).max(9999).messages({
    "number.max": "{#label} must be less than or equal {#limit}",
    "number.min": "{#label} must be more than or equal {#limit}",
    "any.required": "{#label} is required",
  }),
};

export const itemCreateSchema = Joi.object<ItemCreateType>({
  name: itemSchema.name.required(),
  description: itemSchema.description.required(),
  price: itemSchema.price.required(),
  quantity: itemSchema.quantity.default(0),
})
  .required()
  .unknown(false);

export const itemParamSchema = Joi.object<ItemParamType>({
  itemId: itemSchema.id.required(),
})
  .required()
  .unknown(false);

export const itemQuerySchema = Joi.object<ItemQueryType>({
  limit: paginationSchema.limit.optional(),
  page: paginationSchema.page.optional(),
  tagId: tagSchema.id.optional(),
})
  .required()
  .unknown(false);

export const itemUpdateSchema = Joi.object<ItemUpdateType>({
  name: itemSchema.name.optional(),
  description: itemSchema.description.optional(),
  price: itemSchema.price.optional(),
  quantity: itemSchema.quantity.optional(),
})
  .required()
  .unknown(false)
  .min(1);
