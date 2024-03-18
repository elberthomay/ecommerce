import { faker } from "@faker-js/faker";
import Order, { OrderCreationAttribute } from "../../../models/Order";
import { OrderStatuses } from "@elycommerce/common";
import OrderItem, {
  OrderItemCreationAttribute,
} from "../../../models/OrderItem";
import OrderItemImage, {
  OrderItemImageCreationAttribute,
} from "../../../models/OrderItemImage";
import { UserCreationAttribute } from "../../../models/User";
import { ShopCreationAttribute } from "../../../models/Shop";
import { createUser } from "../user/userHelper";
import { createShop } from "../shop/shopHelper";
import { omit } from "lodash";

type PartialOrderGenerationAttribute = Partial<
  Omit<OrderCreationAttribute, "items">
> & {
  items?: OrderItemGenerationAttribute;
};

type PartialOrderItemGenerationAttribute = Partial<
  Omit<OrderItemCreationAttribute, "images">
> & {
  images?: OrderItemImageGenerationAttribute;
};

type OrderGenerationAttribute = number | PartialOrderGenerationAttribute[];
type OrderItemGenerationAttribute =
  | number
  | PartialOrderItemGenerationAttribute[];
type OrderItemImageGenerationAttribute =
  | number
  | Partial<OrderItemImageCreationAttribute>[];

const generateOrderData =
  (data?: Partial<Omit<OrderCreationAttribute, "items">>) =>
  (): Omit<OrderCreationAttribute, "items"> => {
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
      postCode:
        data?.postCode ??
        faker.number.int({ min: 10000, max: 99999 }).toString(),
      addressDetail:
        data?.addressDetail ??
        faker.location.streetAddress({ useFullAddress: true }) +
          " " +
          faker.location.secondaryAddress(),

      createdAt: data?.createdAt ?? new Date().toISOString(),
    };
  };

const generateOrderItemData =
  (data?: Partial<OrderItemCreationAttribute>) =>
  (): OrderItemCreationAttribute => {
    return {
      ...data,
      id: data?.id ?? faker.string.uuid(),
      orderId: data?.orderId ?? faker.string.uuid(),
      name: data?.name ?? faker.commerce.productName(),
      description: data?.description ?? faker.commerce.productDescription(),
      price: data?.price ?? faker.number.int({ min: 0, max: 100000000 }),
      quantity: data?.quantity ?? faker.number.int({ min: 0, max: 9999 }),
    };
  };

const generateOrderItemImageData =
  (data?: Partial<OrderItemImageCreationAttribute>) =>
  (): OrderItemImageCreationAttribute => {
    return {
      orderId: data?.orderId ?? faker.string.uuid(),
      itemId: data?.itemId ?? faker.string.uuid(),
      imageName: data?.imageName ?? faker.string.uuid() + ".webp",
      order: data?.order ?? faker.number.int({ min: 0, max: 9 }),
    };
  };

const fullGenerateOrderData =
  (orderData?: PartialOrderGenerationAttribute) =>
  (): Omit<OrderCreationAttribute, "items"> & {
    items: (Omit<OrderItemCreationAttribute, "images"> & {
      images: OrderItemImageCreationAttribute[];
    })[];
  } => {
    const orderId = orderData?.id ?? faker.string.uuid();

    const completeOrderItemData = expandGenerationAttribute(
      orderData?.items ?? Math.floor(Math.random() * 5 + 1),
      (data) => fullGenerateOrderItemData({ ...data, orderId })
    );

    // generate items to calculate totalPrice, generate array if doesn't exist

    const firstItem = [...completeOrderItemData].sort((a, b) =>
      a.name.localeCompare(b.name)
    )[0];
    const firstItemName = firstItem.name;
    const firstItemImage = firstItem.images?.[0]?.imageName ?? null;
    const totalPrice = completeOrderItemData.reduce(
      (sum, { quantity, price }) => sum + quantity * price,
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
      items: completeOrderItemData,
    };

    return completeOrderData;
  };

const fullGenerateOrderItemData =
  (orderItemData?: PartialOrderItemGenerationAttribute) =>
  (): Omit<OrderItemCreationAttribute, "images"> & {
    images: OrderItemImageCreationAttribute[];
  } => {
    const orderId = orderItemData?.orderId ?? faker.string.uuid();
    const itemId = orderItemData?.id ?? faker.string.uuid();

    const completeImageData = expandGenerationAttribute(
      typeof orderItemData?.images === "object"
        ? orderItemData?.images
        : Array(orderItemData?.images ?? Math.floor(Math.random() * 6))
            .fill(null)
            .map((_, i) => ({ order: i })),
      (data) => generateOrderItemImageData({ ...data, orderId, itemId })
    );

    const completeOrderItemData = {
      ...generateOrderItemData({
        ...orderItemData,
        orderId,
        id: itemId,
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

  const completeOrderData = expandGenerationAttribute(creationData, (data) =>
    fullGenerateOrderData({ ...data, userId: user.id, shopId: shop.id })
  );

  const orders = await Promise.all(
    completeOrderData.map(async (orderData) => {
      const order = await Order.findOne({ where: { id: orderData.id } });
      //create order and item if doesn't exist
      if (!order) {
        const newOrder = await Order.create(omit(orderData, ["items"]));
        const sortedItems = await generateOrderItem(orderData.items);
        newOrder.items = sortedItems;

        return newOrder;
      } else return order;
    })
  );

  return orders;
};

// not to be used on it's own
const generateOrderItem = async (
  creationData: (Omit<OrderItemCreationAttribute, "images"> & {
    images: OrderItemImageCreationAttribute[];
  })[]
) => {
  const orderItems = await Promise.all(
    creationData.map(async (itemData) => {
      const orderItem = await OrderItem.create(omit(itemData, ["images"]));
      const images = await OrderItemImage.bulkCreate(itemData.images);
      const sortedImages = [...images].sort((a, b) => a.order - b.order);
      orderItem.images = sortedImages;
      return orderItem;
    })
  );

  const orderedOrderItems = [...orderItems].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return orderedOrderItems;
};

function expandGenerationAttribute<I extends any, O extends any>(
  creationData: number | I[],
  expansionFunction: (arg?: I) => () => O
): O[] {
  //expand if number, complete if data partials
  return typeof creationData === "number"
    ? faker.helpers.multiple(expansionFunction(), {
        count: creationData,
      })
    : creationData.map((data) => expansionFunction(data)());
}
