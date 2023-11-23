import Joi from "joi";
import { ShopCreateType, ShopParamType } from "../types/shopTypes";
import { paginationSchema, uuidSchema } from "./commonSchema";
import orderNameEnum from "../var/orderNameEnum";

export const shopSchema = {
  id: uuidSchema,
  name: Joi.string().max(255).messages({
    "string.max": "{#label} must be shorter than {#limit} characters",
    "any.required": "{#label} is required",
  }),
};

export const shopCreateSchema = Joi.object<ShopCreateType>({
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
