import { hasPropertyRefineArgument, searchSchema } from "./commonSchema";
import { z } from "zod";

export const shopSchema = z.object({
  id: z.string().max(50),
  name: z
    .string()
    .max(60)
    .min(5)
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9_ \-,]*$/,
      "Shop name must start with letter or number, and contain only letter, number, underscore or dash"
    ),
  description: z.string().max(1000).optional(),
});

export const shopCreateSchema = shopSchema.omit({ id: true }).strict();

export const shopUpdateSchema = shopCreateSchema
  .partial()
  .strict()
  .refine(...hasPropertyRefineArgument);

export const shopNameCheckSchema = z
  .object({
    name: shopSchema.shape.name,
  })
  .strict();

export const shopParamSchema = z.object({
  shopId: shopSchema.shape.id,
});

export const ShopQuerySchema = searchSchema.partial().strict();
