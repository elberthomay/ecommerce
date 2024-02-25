import { hasPropertyRefineArgument, numericIdSchema } from "./commonSchema";
import { z } from "zod";

export const tagSchema = z.object({
  id: z.union([z.string(), z.number()]).pipe(numericIdSchema.max(1000)),
  name: z.string().max(50).min(1),
});

export const tagCreateSchema = z
  .object({
    name: tagSchema.shape.name,
  })
  .strict();

export const tagParamSchema = z.object({
  tagId: tagSchema.shape.id,
});

export const tagPatchSchema = tagCreateSchema
  .partial()
  .strict()
  .refine(...hasPropertyRefineArgument);
