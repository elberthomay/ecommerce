import {
  coordinateCompletenessRefineArgument,
  hasPropertyRefineArgument,
  latitudeSchema,
  longitudeSchema,
  uuidSchema,
} from "./commonSchema";
import { z } from "zod";

export const addressSchema = z.object({
  id: uuidSchema,
  name: z.string().max(40),
  phoneNumber: z
    .string()
    .regex(/^\+\d{1,3}(?:-\d{1,3})? \d{7,15}$/, "Invalid phone number format"),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  village: z.string().max(50).nullish(),
  district: z.string().max(50).nullish(),
  city: z.string().max(50),
  province: z.string().max(50),
  country: z.string().max(50),
  recipient: z.string().max(60),
  postCode: z
    .string()
    .length(5)
    .regex(/^[0-9]+$/, "Must contain only number")
    .optional(),
  detail: z.string().max(200),
  subdistrictId: z.number().int().positive().optional(),
});

export const addressParamSchema = z.object({
  addressId: addressSchema.shape.id,
});

export const addressCreateSchema = addressSchema
  .omit({ id: true })
  .strict()
  .refine(...coordinateCompletenessRefineArgument);

export const addressUpdateSchema = addressSchema
  .omit({ id: true })
  .partial()
  .strict()
  .refine(...coordinateCompletenessRefineArgument)
  .refine(
    (data) =>
      (data.country === undefined &&
        data.province === undefined &&
        data.city === undefined &&
        data.district === undefined &&
        data.village === undefined) ||
      (data.country !== undefined &&
        data.province !== undefined &&
        data.city !== undefined &&
        data.district !== undefined &&
        data.village !== undefined),
    "Administrative address must be complete"
  )
  .refine(...hasPropertyRefineArgument);

export const addressOutputSchema = addressSchema.extend({
  selected: z.boolean(),
});

export const addressOutputArraySchema = z.array(addressOutputSchema);
