import Joi from "joi";
import { uuidSchema } from "./commonSchema";

export const addressSchema = {
  id: uuidSchema,
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  postCode: Joi.string()
    .length(5)
    .pattern(/^[0-9]+$/),
  detail: Joi.string().max(200),
  subdistrictId: Joi.number().integer().positive(),
};

export const addressParamSchema = Joi.object({
  addressId: addressSchema.id.required(),
}).required();

export const addressCreateSchema = Joi.object({
  latitude: addressSchema.latitude.required(),
  longitude: addressSchema.longitude.required(),
  postCode: addressSchema.postCode.optional(),
  detail: addressSchema.detail.optional(),
  subdistrictId: addressSchema.subdistrictId.optional(),
})
  .required()
  .unknown(false);

export const addressUpdateSchema = Joi.object({
  latitude: addressSchema.latitude.optional(),
  longitude: addressSchema.longitude.optional(),
  postCode: addressSchema.postCode.optional(),
  detail: addressSchema.detail.optional(),
  subdistrictId: addressSchema.subdistrictId.optional(),
})
  .required()
  .unknown(false)
  .empty({});
