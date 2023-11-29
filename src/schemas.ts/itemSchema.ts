import Joi from "joi";
import {
  ItemCreateType,
  ItemParamType,
  ItemQueryType,
  ItemTagEditType,
  ItemUpdateType,
} from "../types/itemTypes";
import { paginationSchema, uuidSchema } from "./commonSchema";
import { tagSchema } from "./tagSchema";
import orderNameEnum from "../var/orderNameEnum";
import { shopSchema } from "./shopSchema";
import { MAX_IMAGE_COUNT } from "../var/constants";

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

const tagIdArray = Joi.array().items(tagSchema.id).max(100).unique().min(1);

export const itemCreateSchema = Joi.object<ItemCreateType>({
  name: itemSchema.name.required(),
  description: itemSchema.description.required(),
  price: itemSchema.price.required(),
  quantity: itemSchema.quantity.default(0),
  tags: tagIdArray.optional(),
})
  .required()
  .unknown(false);

export const itemParamSchema = Joi.object<ItemParamType>({
  itemId: itemSchema.id.required(),
})
  .required()
  .unknown(false);

export const itemQuerySchema = Joi.object<ItemQueryType>({
  search: Joi.string()
    .pattern(/[a-zA-Z0-9_\-., ]+/)
    .max(60)
    .empty("")
    .optional(),
  limit: paginationSchema.limit.optional(),
  page: paginationSchema.page.optional(),
  tagIds: Joi.string()
    .pattern(/^\d+(,\d+)*$/) //numbers separated by comma
    .optional(), //Joi.array().items(tagSchema.id).optional(),
  orderBy: Joi.string()
    .valid(...Object.keys(orderNameEnum))
    .optional(),
}).unknown(false);

export const itemUpdateSchema = Joi.object<ItemUpdateType>({
  name: itemSchema.name.optional(),
  description: itemSchema.description.optional(),
  price: itemSchema.price.optional(),
  quantity: itemSchema.quantity.optional(),
})
  .required()
  .unknown(false)
  .min(1);

export const itemTagEditSchema = Joi.object<ItemTagEditType>({
  tags: tagIdArray.required(),
});

export const itemGetOutputSchema = Joi.array()
  .items(
    Joi.object({
      id: itemSchema.id.required(),
      name: itemSchema.name.required(),
      price: itemSchema.price.required(),
      quantity: itemSchema.quantity.required(),
      shopId: shopSchema.id.required(),
      shopName: shopSchema.name.required(),
      image: Joi.string().optional(),
    })
      .unknown(false)
      .required()
  )
  .required();

export const itemDetailsOutputSchema = Joi.object({
  id: itemSchema.id.required(),
  name: itemSchema.name.required(),
  price: itemSchema.price.required(),
  description: itemSchema.description.required(),
  quantity: itemSchema.quantity.required(),
  shopId: shopSchema.id.required(),
  shopName: shopSchema.name.required(),
  images: Joi.array()
    .items(Joi.object({ imageName: Joi.string(), order: Joi.number() }))
    .required(),
  tags: Joi.array()
    .items(Joi.object({ id: tagSchema.id, order: tagSchema.name }))
    .required(),
})
  .unknown(false)
  .required();

export const itemImageOrdersSchema = Joi.array()
  .items(Joi.number().max(9).min(0).integer())
  .required()
  .min(1)
  .max(MAX_IMAGE_COUNT);
