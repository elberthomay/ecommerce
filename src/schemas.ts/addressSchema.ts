import Joi from "joi";
import { uuidSchema } from "./commonSchema";
import {
  AddressCreateType,
  AddressOutputType,
  AddressUpdateType,
} from "../types/addressType";

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

export const addressCreateSchema = Joi.object<AddressCreateType>({
  latitude: addressSchema.latitude.optional(),
  longitude: addressSchema.longitude.optional(),
  postCode: addressSchema.postCode.optional(),
  detail: addressSchema.detail.required(),
  subdistrictId: addressSchema.subdistrictId.optional(),
})
  .required()
  .and("latitude", "longitude")
  .unknown(false);

export const addressUpdateSchema = Joi.object<AddressUpdateType>({
  latitude: addressSchema.latitude.optional(),
  longitude: addressSchema.longitude.optional(),
  postCode: addressSchema.postCode.optional(),
  detail: addressSchema.detail.optional(),
  subdistrictId: addressSchema.subdistrictId.optional(),
})
  .required()
  .and("latitude", "longitude")
  .unknown(false)
  .empty({});

export const addressOutputSchema = Joi.object<AddressOutputType>({
  id: addressSchema.id.required(),
  latitude: addressSchema.latitude.required().allow(null),
  longitude: addressSchema.longitude.required().allow(null),
  postCode: addressSchema.postCode.required().allow(null),
  detail: addressSchema.detail.required(),
  subdistrictId: addressSchema.subdistrictId.required().allow(null),
  selected: Joi.boolean().required(),
});

export const addressOutputArraySchema = Joi.array().items(addressOutputSchema);
