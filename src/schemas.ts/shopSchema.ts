import Joi from "joi";
import {
  ShopCreateType,
  ShopParamType,
  ShopUpdateType,
} from "../types/shopTypes";
import { searchSchema, uuidSchema } from "./commonSchema";

export const shopSchema = {
  id: uuidSchema,
  name: Joi.string()
    .max(60)
    .min(5)
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9_ \-,]*$/)
    .messages({
      "string.max": "{#label} must be shorter than {#limit} characters",
      "string.min": "{#label} must be longer than {#limit} characters",
      "string.pattern":
        "{#label} must start with letter or number, and contain only letter, number, underscore or dash",
      "any.required": "{#label} is required",
    }),
  description: Joi.string().max(1000).messages({
    "string.min": "{#label} must be longer than {#limit} characters",
  }),
};

export const shopCreateSchema = Joi.object<ShopCreateType>({
  name: shopSchema.name.required(),
  description: shopSchema.description.optional(),
})
  .required()
  .unknown(false);

export const shopUpdateSchema = Joi.object<ShopUpdateType>({
  name: shopSchema.name.optional(),
  description: shopSchema.description.optional(),
})
  .required()
  .empty({})
  .unknown(false);

export const shopNameCheckSchema = Joi.object<ShopCreateType>({
  name: shopSchema.name.required(),
})
  .required()
  .unknown(false);

export const shopParamSchema = Joi.object<ShopParamType>({
  shopId: shopSchema.id.required(),
})
  .required()
  .unknown(false);

export const ShopQuerySchema = Joi.object({
  search: searchSchema.search.optional(),
  limit: searchSchema.limit.optional(),
  page: searchSchema.limit.optional(),
  orderBy: searchSchema.orderBy.optional(),
}).unknown(false);
