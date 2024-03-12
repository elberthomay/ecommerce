import { z } from "zod";
import { latitudeSchema, longitudeSchema, uuidSchema } from "./commonSchema";
import {
  itemDetailsOutputSchema,
  itemSchema,
  shopItemGetOutputBase,
} from "./itemSchema";
import { addressSchema } from "./addressSchema";
import { userSchema } from "./userSchema";
import { shopSchema } from "./shopSchema";
import { OrderStatuses } from "../var/orderEnum";

export const orderAddressSchema = addressSchema
  .omit({ id: true, name: true, subdistrictId: true, detail: true })
  .extend({
    addressDetail: addressSchema.shape.detail,
    latitude: latitudeSchema.nullish().transform((lat) => lat ?? undefined),
    longitude: longitudeSchema.nullish().transform((lng) => lng ?? undefined),
  });

export const formatOrderAddress = addressSchema
  .omit({ id: true, name: true, subdistrictId: true, postCode: true })
  .extend({
    postCode: addressSchema.shape.postCode
      .nullish()
      .transform((code) => code ?? undefined),
    latitude: latitudeSchema.nullish().transform((lat) => lat ?? undefined),
    longitude: longitudeSchema.nullish().transform((lng) => lng ?? undefined),
  })
  .transform((address) => ({
    ...address,
    detail: undefined,
    addressDetail: address.detail,
  }));

export const orderSchema = z
  .object({
    id: uuidSchema,
    userId: userSchema.shape.id,
    shopId: shopSchema.shape.id,
    status: z.nativeEnum(OrderStatuses),
    createdAt: z.date(),
  })
  .merge(orderAddressSchema);

export const getOrdersOutputSchema = z.array(
  orderSchema.extend({
    totalPrice: z.number(),
    items: z.array(shopItemGetOutputBase),
    shopName: shopSchema.shape.name,
    createdAt: z.string().datetime(),
  })
);

export const formatOrder = orderSchema
  .extend({
    shop: z.object({ name: shopSchema.shape.name }),
    items: z.array(
      itemDetailsOutputSchema
        .pick({
          id: true,
          name: true,
          price: true,
          quantity: true,
          images: true,
        })
        .transform((item) => ({
          ...item,
          images: undefined,
          image: item.images[0]?.imageName ?? null,
        }))
    ),
  })
  .transform((order) => ({
    ...order,
    shop: undefined,
    shopName: order.shop.name,
    totalPrice: order.items.reduce(
      (sum, { price, quantity }) => sum + price * quantity,
      0
    ),
    createdAt: order.createdAt.toISOString(),
  }));

export const orderOutputSchema = orderSchema
  .extend({
    shopName: shopSchema.shape.name,
    totalPrice: z.number(),
    items: z.array(
      itemDetailsOutputSchema
        .pick({
          id: true,
          name: true,
          price: true,
          quantity: true,
        })
        .extend({
          image: z.string(),
        })
    ),
    createdAt: z.string().datetime(),
  })
  .refine(
    ({ items, totalPrice }) =>
      items.reduce((sum, { price, quantity }) => sum + price * quantity, 0) ===
      totalPrice,
    "total price is incorrect"
  );

export const formatGetOrders = z.array(formatOrder);

export const formatOrderItem = itemDetailsOutputSchema
  .pick({
    id: true,
    name: true,
    price: true,
    quantity: true,
    description: true,
    images: true,
  })
  .extend({ createdAt: z.date().transform((date) => date.toISOString()) });

export const orderItemOutputSchema = formatOrderItem
  .omit({
    createdAt: true,
  })
  .extend({ createdAt: z.string().datetime() });

export const getOrderItemParam = z.object({
  orderId: orderSchema.shape.id,
  itemId: itemSchema.shape.id,
});

export const getOrdersOption = z.object({
  userId: userSchema.shape.id.optional(),
  shopId: shopSchema.shape.id.optional(),
  status: z.array(z.nativeEnum(OrderStatuses)).max(10).optional(),
  itemName: itemSchema.shape.name.optional(),
  newerThan: z
    .string()
    .datetime()
    .transform((isoString) => new Date(isoString))
    .optional(),
  orderBy: z.enum(["newest", "oldest"]).default("newest").optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
});

export const getOrdersParam = getOrdersOption
  .pick({ userId: true, shopId: true })
  .refine(
    ({ userId, shopId }) => userId !== undefined || shopId !== undefined,
    "userId or shopId must be defined"
  );

export const getOrdersQuery = getOrdersOption
  .omit({ userId: true, shopId: true, status: true, limit: true, page: true })
  .extend({
    status: z
      .union([
        z.string().transform((statuses) => statuses.split(",")),
        z.undefined(),
      ])
      .pipe(getOrdersOption.shape.status),
    limit: z.string().optional().pipe(getOrdersOption.shape.limit),
    page: z.string().optional().pipe(getOrdersOption.shape.page),
  });

export const orderStatusChangeParams = z.object({
  orderId: orderSchema.shape.id,
});
