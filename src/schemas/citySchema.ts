import { z } from "zod";
import {
  coordinateCompletenessRefineArgument,
  hasPropertyRefineArgument,
  latitudeSchema,
  longitudeSchema,
  numericIdSchema,
} from "./commonSchema";

export const citySchema = z.object({
  id: numericIdSchema,
  name: z.string().max(255),
  longitude: longitudeSchema,
  latitude: latitudeSchema,
});

export const cityIdSchema = z.object({ cityId: citySchema.shape.id });

export const cityCreateSchema = citySchema.omit({ id: true }).strict();

export const cityUpdateSchema = cityCreateSchema
  .partial()
  .strict()
  .refine(...hasPropertyRefineArgument)
  .refine(...coordinateCompletenessRefineArgument);
