import { faker } from "@faker-js/faker";
import { OrderStatuses } from "@elycommerce/common";
import { UserCreationAttribute } from "../../../models/User";
import { ShopCreationAttribute } from "../../../models/Shop";
import { createUser } from "../user/userHelper";
import { createShop } from "../shop/shopHelper";
import {
  OrderOrderItem,
  TempOrderItem,
  Order,
  TempOrderItemImage,
  OrderItemImage,
} from "../../../kysely/schema";
import { Insertable } from "kysely";
import { db } from "../../../kysely/database";
import {
  getFullOrderQuery,
  getOrderDetailQuery,
  getOrderItemQueryByVersion,
} from "../../../kysely/queries/orderQueries";

type OrderItemComponents = {
  orderItem: Insertable<TempOrderItem>;
  orderOrderItem: Insertable<OrderOrderItem>;
  images: Insertable<TempOrderItemImage>[];
};

type PartialOrderGenerationAttribute = Partial<Insertable<Order>> & {
  items?: OrderItemGenerationAttribute;
};

type PartialOrderItemGenerationAttribute = Partial<
  Insertable<TempOrderItem> & Omit<Insertable<OrderOrderItem>, "itemId">
> & {
  images?: OrderItemImageGenerationAttribute;
};

type OrderGenerationAttribute = number | PartialOrderGenerationAttribute[];

type OrderItemGenerationAttribute =
  | number
  | PartialOrderItemGenerationAttribute[];

type OrderItemImageGenerationAttribute =
  | number
  | Partial<Insertable<TempOrderItemImage>>[];

const generateOrderData =
  (data?: Partial<Insertable<Order>>) => (): Insertable<Order> => {
    return {
      id: data?.id ?? faker.string.uuid(),
      userId: data?.userId ?? faker.string.uuid(),
      shopId: data?.shopId ?? faker.string.uuid(),
      status:
        data?.status ??
        Object.values(OrderStatuses)[
          Math.floor(Math.random() * Object.values(OrderStatuses).length)
        ],

      image:
        data?.image !== undefined ? data.image : `${faker.string.uuid()}.webp`,
      name: data?.name ?? faker.commerce.productName(),
      totalPrice:
        data?.totalPrice ?? faker.number.int({ min: 0, max: 9999999999999 }),

      phoneNumber:
        data?.phoneNumber ??
        // +{3 number}{space}{7-15 number that does not start with 0}
        `+${faker.string.numeric(3)} ${faker.string.numeric({
          length: 1,
          exclude: ["0"],
        })}${faker.string.numeric({
          length: { min: 6, max: 14 },
        })}`,
      longitude: data?.longitude ?? faker.location.longitude(),
      latitude: data?.latitude ?? faker.location.latitude(),
      village: data?.village ?? faker.location.street().slice(0, 50),
      district: data?.district ?? faker.location.county().slice(0, 50),
      city: data?.city ?? faker.location.city().slice(0, 50),
      province: data?.city ?? faker.location.state().slice(0, 50),
      country: data?.country ?? faker.location.country().slice(0, 50),
      recipient: data?.recipient ?? faker.person.fullName().slice(0, 60),
      // postCode:
      //   data?.postCode ??
      //   faker.number.int({ min: 10000, max: 99999 }).toString(),
      addressDetail:
        data?.addressDetail ??
        faker.location.streetAddress({ useFullAddress: true }) +
          " " +
          faker.location.secondaryAddress(),

      createdAt: data?.createdAt ?? new Date(),
      updatedAt: data?.updatedAt ?? new Date(),
    };
  };

const generateOrderItemData =
  (data?: Partial<Insertable<TempOrderItem>>) =>
  (): Insertable<TempOrderItem> => {
    return {
      id: data?.id ?? faker.string.uuid(),
      version: data?.version ?? faker.number.int(),
      name: data?.name ?? faker.commerce.productName(),
      description: data?.description ?? faker.commerce.productDescription(),
      price: data?.price ?? faker.number.int({ min: 0, max: 100000000 }),
      createdAt: data?.createdAt ?? new Date(),
      updatedAt: data?.updatedAt ?? new Date(),
    };
  };

const generateOrderOrderItemData =
  (data?: Partial<Insertable<OrderOrderItem>>) =>
  (): Insertable<OrderOrderItem> => {
    return {
      orderId: data?.orderId ?? faker.string.uuid(),
      itemId: data?.itemId ?? faker.string.uuid(),
      version: data?.version ?? faker.number.int(),
      quantity: data?.quantity ?? faker.number.int({ min: 0, max: 9999 }),
      createdAt: data?.createdAt ?? new Date(),
      updatedAt: data?.updatedAt ?? new Date(),
    };
  };

const generateOrderItemImageData =
  (data?: Partial<Insertable<TempOrderItemImage>>) =>
  (): Insertable<TempOrderItemImage> => {
    return {
      itemId: data?.itemId ?? faker.string.uuid(),
      version: data?.version ?? faker.number.int(),
      imageName: data?.imageName ?? faker.string.uuid() + ".webp",
      order: data?.order ?? faker.number.int({ min: 0, max: 9 }),
      createdAt: data?.createdAt ?? new Date(),
      updatedAt: data?.updatedAt ?? new Date(),
    };
  };

export const fullGenerateOrderData =
  (orderData?: PartialOrderGenerationAttribute) =>
  (): Insertable<Order> & {
    items: OrderItemComponents[];
  } => {
    const orderId = orderData?.id ?? faker.string.uuid();

    // generate items to calculate totalPrice, generate array if doesn't exist
    const completeOrderItemData = expandGenerationAttribute(
      orderData?.items ?? Math.floor(Math.random() * 5 + 1),
      (data, i) => fullGenerateOrderItemData({ ...data, orderId, version: i })
    );

    const sortedItems = [...completeOrderItemData].sort((a, b) =>
      a.orderItem.name
        .toLowerCase()
        .localeCompare(b.orderItem.name.toLowerCase())
    );

    const firstItem = sortedItems[0];
    const firstItemName = firstItem.orderItem.name;
    const firstItemImage = firstItem.images?.[0]?.imageName ?? null;
    const totalPrice = completeOrderItemData.reduce(
      (sum, { orderItem: { price }, orderOrderItem: { quantity } }) =>
        sum + (quantity ?? 1) * price,
      0
    );

    const completeOrderData = {
      ...generateOrderData({
        ...orderData,
        id: orderId,
        name: firstItemName,
        totalPrice,
        image: firstItemImage,
      })(),
      items: sortedItems,
    };

    return completeOrderData;
  };

export const fullGenerateOrderItemData =
  (orderItemData?: PartialOrderItemGenerationAttribute) =>
  (): {
    orderItem: Insertable<TempOrderItem>;
    orderOrderItem: Insertable<OrderOrderItem>;
    images: Insertable<TempOrderItemImage>[];
  } => {
    const orderId = orderItemData?.orderId ?? faker.string.uuid();
    const itemId = orderItemData?.id ?? faker.string.uuid();
    const version = orderItemData?.version ?? faker.number.int();

    const completeImageData = expandGenerationAttribute(
      typeof orderItemData?.images === "object"
        ? orderItemData?.images
        : Array(orderItemData?.images ?? Math.floor(Math.random() * 6))
            .fill(null)
            .map((_, i) => ({ order: i })),
      (data) => generateOrderItemImageData({ ...data, itemId, version })
    );

    const completeOrderItemData = {
      orderItem: generateOrderItemData({
        ...orderItemData,
        id: itemId,
        version,
      })(),
      orderOrderItem: generateOrderOrderItemData({
        ...orderItemData,
        orderId,
        itemId,
        version,
      })(),
      images: completeImageData,
    };

    return completeOrderItemData;
  };

/**
 * create items using count or array of fragmented item data.
 * all item would be created for one shop,
 * optional shop data could be provided.
 * @param creationData number | array of ItemCreationAttribute fragment
 * @param optionalShop Partial of ShopCreationAtrribute
 */
export const generateOrders = async (
  creationData: OrderGenerationAttribute,
  optionalUser?: Partial<UserCreationAttribute>,
  optionalShop?: Partial<ShopCreationAttribute>
) => {
  const {
    users: [user],
  } = await createUser(optionalUser ? [optionalUser] : 1);
  const [shop] = await createShop(optionalShop ? [optionalShop] : 1);

  const completeOrderDatas = expandGenerationAttribute(creationData, (data) =>
    fullGenerateOrderData({ ...data, userId: user.id, shopId: shop.id })
  );

  const orderDatas: Insertable<Order>[] = [];
  const OrderItemComponents: OrderItemComponents[] = [];
  const orderItemDatas: Insertable<TempOrderItem>[] = [];
  const orderOrderItemDatas: Insertable<OrderOrderItem>[] = [];
  const orderItemImagesDatas: Insertable<TempOrderItemImage>[] = [];

  completeOrderDatas.map(({ items, ...other }) => {
    orderDatas.push(other);
    OrderItemComponents.push(...items);
  });

  OrderItemComponents.map(({ orderItem, orderOrderItem, images }) => {
    orderItemDatas.push(orderItem);
    orderOrderItemDatas.push(orderOrderItem);
    orderItemImagesDatas.push(...images);
  });

  await db.insertInto("Order").ignore().values(orderDatas).execute();

  if (orderItemDatas.length > 0)
    await db
      .insertInto("TempOrderItem")
      .ignore()
      .values(orderItemDatas)
      .execute();

  if (orderOrderItemDatas.length > 0)
    await db
      .insertInto("OrderOrderItem")
      .ignore()
      .values(orderOrderItemDatas)
      .execute();
  if (orderItemImagesDatas.length > 0)
    await db
      .insertInto("TempOrderItemImage")
      .ignore()
      .values(orderItemImagesDatas)
      .execute();

  const orders = await Promise.all(
    completeOrderDatas.map(
      async ({ id }) => (await getFullOrderQuery(id).executeTakeFirst())!
    )
  );

  return orders;
};

export const generateOrderItems = async (
  creationData: OrderItemGenerationAttribute
) => {
  const completeOrderItemDatas = expandGenerationAttribute(
    creationData,
    (data) => fullGenerateOrderItemData({ version: 0, ...data })
  );

  const orderItemDatas = completeOrderItemDatas
    .map(({ orderItem }) => orderItem)
    .flat();

  const orderItemImageDatas = completeOrderItemDatas
    .map(({ images }) => images)
    .flat();

  await db
    .insertInto("TempOrderItem")
    .ignore()
    .values(orderItemDatas)
    .execute();
  await db
    .insertInto("TempOrderItemImage")
    .ignore()
    .values(orderItemImageDatas)
    .execute();

  const orderItems = await Promise.all(
    completeOrderItemDatas.map(
      async ({ orderItem: { id, version } }) =>
        (await getOrderItemQueryByVersion(id, version!).executeTakeFirst())!
    )
  );

  return orderItems;
};

function expandGenerationAttribute<I extends any, O extends any>(
  creationData: number | I[],
  expansionFunction: (arg?: I, index?: number) => () => O
): O[] {
  //expand if number, complete if data partials
  return typeof creationData === "number"
    ? faker.helpers.multiple(expansionFunction(), {
        count: creationData,
      })
    : creationData.map((data, i) => expansionFunction(data, i)());
}
