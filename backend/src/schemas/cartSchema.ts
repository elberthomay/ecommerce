import { itemSchema } from "./itemSchema";
import { userSchema } from "./userSchema";
import { shopSchema } from "./shopSchema";
import { z } from "zod";
import { minPropertyRefineArgument } from "./commonSchema";

export const cartSchema = z.object({
  userId: userSchema.shape.id,
  itemId: itemSchema.shape.id,
  quantity: z.number().min(0).max(9999).default(1),
  selected: z.boolean().default(true),
});

export const cartCreateSchema = cartSchema.omit({ userId: true }).strict();

export const cartUpdateSchema = z
  .object({
    itemId: cartSchema.shape.itemId,
    quantity: cartSchema.shape.quantity.optional(),
    selected: cartSchema.shape.selected.optional(),
  })
  .strict()
  .refine(...minPropertyRefineArgument(2));

export const cartDeleteSchema = cartSchema.pick({ itemId: true }).strict();

export const cartOutputSchema = z
  .object({
    inventory: itemSchema.shape.quantity,
    itemId: itemSchema.shape.id,
    name: itemSchema.shape.name,
    price: itemSchema.shape.price,
    quantity: cartSchema.shape.quantity,
    image: z.string().nullable(),
    selected: cartSchema.shape.selected,
    shopId: shopSchema.shape.id,
    shopName: shopSchema.shape.name,
  })
  .strict();

export const cartOutputListSchema = z.array(cartOutputSchema);
