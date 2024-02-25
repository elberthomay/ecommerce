import {
  hasPropertyRefineArgument,
  searchSchema,
  uuidSchema,
} from "./commonSchema";
import { tagSchema } from "./tagSchema";
import { shopSchema } from "./shopSchema";
import { MAX_IMAGE_COUNT } from "../var/constants";
import { z } from "zod";

export const itemSchema = z.object({
  id: uuidSchema,
  name: z.string().max(255),
  description: z.string().max(2000),
  price: z.number().min(0).max(1000000000),
  quantity: z.number().min(0).max(9999).default(1),
});

const tagIdArray = z
  .array(tagSchema.shape.id)
  .transform((arr) => new Set(arr))
  .pipe(
    z
      .set(tagSchema.shape.id)
      .min(1)
      .max(100)
      .transform((set) => [...set])
  );

export const itemCreateSchema = itemSchema
  .omit({ id: true })
  .merge(z.object({ tags: tagIdArray.optional() }))
  .strict();

export const itemParamSchema = z.object({
  itemId: itemSchema.shape.id,
});

export const itemQuerySchema = searchSchema
  .partial()
  .extend({
    tagIds: z
      .string()
      .regex(/^\d+(,\d+)*$/, "Must be a number separated by comma")
      .optional()
      .transform((tags) => tags?.split(",")),
  })
  .strict();

export const itemUpdateSchema = itemSchema
  .omit({ id: true })
  .partial()
  .strict()
  .refine(...hasPropertyRefineArgument);

export const itemTagEditSchema = z
  .object({
    tags: tagIdArray,
  })
  .strict();

const itemSchemaBase = itemSchema.extend({
  shopId: shopSchema.shape.id,
  shopName: shopSchema.shape.name,
});

export const itemDetailsOutputSchema = itemSchemaBase
  .extend({
    images: z.array(z.object({ imageName: z.string(), order: z.number() })),
    tags: z.array(tagSchema.pick({ id: true, name: true })),
  })
  .strict();

export const itemGetOutputBase = itemSchemaBase
  .extend({
    image: z.string().nullable(),
  })
  .omit({ description: true });

export const shopItemGetOutputBase = itemGetOutputBase.omit({
  shopId: true,
  shopName: true,
});

export const itemGetOutputSchema = z.object({
  count: z.number().int().min(0),
  rows: z.array(itemGetOutputBase),
});

export const shopItemGetOutputSchema = z.object({
  count: z.number().int().min(0),
  rows: z.array(shopItemGetOutputBase),
});

export const itemImageOrdersSchema = z
  .array(
    z
      .number()
      .int()
      .min(0)
      .max(MAX_IMAGE_COUNT - 1)
  )
  .min(1)
  .max(MAX_IMAGE_COUNT);
