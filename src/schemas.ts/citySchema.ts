import {
  latitudeSchema,
  longitudeSchema,
  numericIdSchema,
} from "./commonSchema";
import Joi from "joi";

export const citySchema = {
  id: numericIdSchema,
  name: Joi.string().max(255),
  longitude: longitudeSchema,
  latitude: latitudeSchema,
};

export const cityIdSchema = Joi.object({ cityId: citySchema.id.required() })
  .required()
  .unknown(false);

export const cityCreateSchema = Joi.object({
  name: citySchema.id.required(),
  longitude: citySchema.longitude.required(),
  latitude: citySchema.latitude.required(),
});

export const cityUpdateSchema = Joi.object({
  name: citySchema.id.optional(),
  longitude: citySchema.longitude.optional(),
  latitude: citySchema.latitude.optional(),
});
