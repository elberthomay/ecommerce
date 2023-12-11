import Joi from "joi";
import orderNameEnum from "../var/orderNameEnum";

export const uuidSchema = Joi.string().uuid({
  version: "uuidv4",
  separator: "-",
});

export const numericIdSchema = Joi.number().integer().min(1);

export const searchSchema = {
  search: Joi.string()
    .pattern(/[a-zA-Z0-9_\-., ]+/)
    .max(60)
    .empty(""),
  limit: Joi.number().min(1).max(500),
  page: Joi.number().min(1).max(5000),
  orderBy: Joi.string().valid(...Object.keys(orderNameEnum)),
};

export const longitudeSchema = Joi.number()
  .min(-180)
  .max(180)
  .custom((value, helpers) => Math.round(value * 10000) / 10000);

export const latitudeSchema = Joi.number()
  .min(-90)
  .max(90)
  .custom((value, helpers) => Math.round(value * 10000) / 10000);
