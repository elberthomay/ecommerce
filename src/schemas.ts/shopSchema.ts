import Joi from "joi";
import { ShopCreateType, ShopParamType } from "../types/shopTypes";
import { paginationSchema, uuidSchema } from "./commonSchema";
import orderNameEnum from "../var/orderNameEnum";

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
};

export const shopCreateSchema = Joi.object<ShopCreateType>({
  name: shopSchema.name.required(),
})
  .required()
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
  limit: paginationSchema.limit.optional(),
  page: paginationSchema.limit.optional(),
  orderBy: Joi.string()
    .valid(...Object.keys(orderNameEnum))
    .optional(),
}).unknown(false);
