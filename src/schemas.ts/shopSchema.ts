import Joi from "joi";

const nameSchema = Joi.string().max(255).messages({
  "string.max": "{#label} must be shorter than {#limit} characters",
  "any.required": "{#label} is required",
});

const descriptionSchema = Joi.string().max(2000).messages({
  "string.max": "{#label} must be shorter than {#limit} characters",
  "any.required": "{#label} is required",
});

const priceSchema = Joi.number().min(0).max(1000000000).messages({
  "number.max": "{#label} must be less or than or equal Rp.{#limit},00",
  "number.min": "{#label} must be more than or equal Rp.{#limit},00",
  "any.required": "{#label} is required",
});

const quantitySchema = Joi.number().min(0).max(9999).messages({
  "number.max": "{#label} must be less than or equal {#limit}",
  "number.min": "{#label} must be more than or equal {#limit}",
  "any.required": "{#label} is required",
});

export interface shopActivateType {
  name: string;
}

export const shopActivateSchema = Joi.object<shopActivateType>({
  name: nameSchema.required(),
})
  .required()
  .unknown(false);

export interface addItemType {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export const addItemSchema = Joi.object<addItemType>({
  name: nameSchema.required(),
  description: descriptionSchema.required(),
  price: priceSchema.required(),
  quantity: quantitySchema.default(0),
})
  .required()
  .unknown(false);

const idSchema = Joi.string()
  .uuid({ version: "uuidv4", separator: "-" })
  .required();

export const itemIdSchema = Joi.object({
  itemId: idSchema,
})
  .required()
  .unknown(false);

export const shopIdSchema = Joi.object({
  shopId: idSchema,
})
  .required()
  .unknown(false);

const paginationLimitSchema = Joi.number().min(1).max(200).optional();
const paginationPageSchema = Joi.number().min(1).max(5000).optional();

export const paginationQuerySchema = Joi.object({
  limit: paginationLimitSchema,
  page: paginationPageSchema,
})
  .required()
  .unknown(false);

export const itemQuerySchema = Joi.object({
  limit: paginationLimitSchema,
  page: paginationPageSchema,
  tagId: Joi.number().integer().min(0).max(100000),
})
  .required()
  .unknown(false);

export interface editItemType {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
}

export const editItemSchema = Joi.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  quantity: quantitySchema,
})
  .required()
  .unknown(false)
  .min(1);
