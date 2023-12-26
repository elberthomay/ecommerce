import Joi from "joi";
import { uuidSchema } from "./commonSchema";
import {
  AddressCreateType,
  AddressOutputType,
  AddressUpdateType,
} from "../types/addressType";

export const addressSchema = {
  id: uuidSchema,
  name: Joi.string().max(40),
  phoneNumber: Joi.string()
    .regex(/^\+\d{1,3}(?:-\d{1,3})? \d{7,15}$/)
    .message("Invalid phone number format"),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  village: Joi.string().max(50).allow(null),
  district: Joi.string().max(50).allow(null),
  city: Joi.string().max(50),
  province: Joi.string().max(50),
  country: Joi.string().max(50),
  recipient: Joi.string().max(60),
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
  name: addressSchema.name.required(),
  phoneNumber: addressSchema.phoneNumber.required(),
  latitude: addressSchema.latitude.optional(),
  longitude: addressSchema.longitude.optional(),
  village: addressSchema.village.optional(),
  district: addressSchema.district.optional(),
  city: addressSchema.city.required(),
  province: addressSchema.province.required(),
  country: addressSchema.country.required(),
  recipient: addressSchema.recipient.required(),
  postCode: addressSchema.postCode.optional(),
  detail: addressSchema.detail.required(),
  subdistrictId: addressSchema.subdistrictId.optional(),
})
  .required()
  .and("latitude", "longitude")
  .unknown(false);

export const addressUpdateSchema = Joi.object<AddressUpdateType>({
  name: addressSchema.name.optional(),
  phoneNumber: addressSchema.phoneNumber.optional(),
  latitude: addressSchema.latitude.optional(),
  longitude: addressSchema.longitude.optional(),
  village: addressSchema.village.optional(),
  district: addressSchema.district.optional(),
  city: addressSchema.city.optional(),
  province: addressSchema.province.optional(),
  country: addressSchema.country.optional(),
  recipient: addressSchema.recipient.optional(),
  postCode: addressSchema.postCode.optional(),
  detail: addressSchema.detail.optional(),
  subdistrictId: addressSchema.subdistrictId.optional(),
})
  .required()
  .and("latitude", "longitude")
  .and("country", "province", "city", "district", "village")
  .unknown(false)
  .empty({});

export const addressOutputSchema = Joi.object<AddressOutputType>({
  id: addressSchema.id.required(),
  name: addressSchema.name.required(),
  phoneNumber: addressSchema.phoneNumber.required(),
  latitude: addressSchema.latitude.optional(),
  longitude: addressSchema.longitude.optional(),
  detail: addressSchema.detail.required(),
  village: addressSchema.village.optional(),
  district: addressSchema.district.optional(),
  city: addressSchema.city.required(),
  province: addressSchema.province.required(),
  country: addressSchema.country.required(),
  recipient: addressSchema.recipient.required(),

  postCode: addressSchema.postCode.optional(),
  subdistrictId: addressSchema.subdistrictId.optional(),
  selected: Joi.boolean().required(),
});

export const addressOutputArraySchema = Joi.array().items(addressOutputSchema);
