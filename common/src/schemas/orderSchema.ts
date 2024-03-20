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
    name: itemSchema.shape.name,
    image: z.string().nullish(),
    totalPrice: z.number(),
    status: z.nativeEnum(OrderStatuses),
    createdAt: z.date(),
    updatedAt: z.date(),
    timeout: z.string().datetime().optional(),
  })
  .merge(orderAddressSchema);

//expected shape of output of updateOrder
export const orderOutputSchema = orderSchema.extend({
  shopName: shopSchema.shape.name,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// expected shape of getOrders
export const getOrdersOutputSchema = z.array(orderOutputSchema);

// format order from Order
export const formatOrder = orderSchema
  .extend({
    shop: z.object({ name: shopSchema.shape.name }),
  })
  .transform((order) => ({
    ...order,
    shop: undefined,
    shopName: order.shop.name,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.createdAt.toISOString(),
  }));

//format getOrders from Order[]
export const formatGetOrders = z.array(formatOrder);

// expected shape of getOrderDetail
export const getOrderDetailOutputSchema = orderSchema.extend({
  items: z.array(shopItemGetOutputBase),
  shopName: shopSchema.shape.name,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// format order detail from Order
export const formatOrderDetail = orderSchema
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
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }));

export const formatOrderItem = itemDetailsOutputSchema
  .pick({
    id: true,
    name: true,
    price: true,
    quantity: true,
    description: true,
    images: true,
  })
  .extend({
    createdAt: z.date().transform((date) => date.toISOString()),
    order: z.object({
      shopId: shopSchema.shape.id,
      shop: shopSchema.pick({
        name: true,
      }),
    }),
  })
  .transform((orderItem) => ({
    ...orderItem,
    order: undefined,
    shopId: orderItem.order.shopId,
    shopName: orderItem.order.shop.name,
  }));

export const orderItemOutputSchema = itemDetailsOutputSchema
  .pick({
    id: true,
    name: true,
    price: true,
    quantity: true,
    description: true,
    shopId: true,
    images: true,
    shopName: true,
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
