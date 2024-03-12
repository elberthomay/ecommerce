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

type OrderGenerationAttribute = Partial<
  Omit<OrderCreationAttribute, "items" | "userId" | "shopId">
> & { items?: OrderItemGenerationAttribute };
type OrderItemGenerationAttribute =
  | number
  | (Partial<OrderItemCreationAttribute> & {
      images?: OrderItemImageGenerationAttribute;
    })[];
type OrderItemImageGenerationAttribute =
  | number
  | Omit<OrderItemImageCreationAttribute, "orderId" | "itemId">[];

function collateOrderGenerationData(
  orderData: OrderGenerationAttribute,
  userId: string,
  shopId: string
) {
  const orderId = orderData?.id ?? faker.string.uuid();

  // generate price to calculate totalPrice, generate array if doesn't exist
  const itemCreationDatas: OrderItemGenerationAttribute =
    orderData.items === undefined
      ? Math.floor(Math.random() * 6)
      : orderData.items; //already itemCreationDatas

  const createOrderData =
    (
      data?: Partial<
        Omit<OrderCreationAttribute, "items" | "userId" | "shopId">
      >
    ) =>
    (): OrderCreationAttribute => {
      return {
        id: orderId,
        userId,
        shopId,
        status:
          data?.status ??
          Object.values(OrderStatuses)[
            Math.floor(Math.random() * Object.values(OrderStatuses).length)
          ],

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

  return {
    orderData: createOrderData(orderData)(),
    itemData: itemCreationDatas,
  };
}

/**
 * create items using count or array of fragmented item data.
 * all item would be created for one shop,
 * optional shop data could be provided.
 * @param creationData number | array of ItemCreationAttribute fragment
 * @param optionalShop Partial of ShopCreationAtrribute
 */
export const generateOrders = async (
  creationData: number | OrderGenerationAttribute[],
  optionalUser?: Partial<UserCreationAttribute>,
  optionalShop?: Partial<ShopCreationAttribute>
) => {
  const {
    users: [user],
  } = await createUser(optionalUser ? [optionalUser] : 1);
  const [shop] = await createShop(optionalShop ? [optionalShop] : 1);

  //expand if a number
  const baseData: OrderGenerationAttribute[] =
    typeof creationData === "number"
      ? Array.from({ length: creationData }).map((_) => ({}))
      : creationData;

  const generatedData = baseData.map((data) =>
    collateOrderGenerationData(data, user.id, shop.id)
  );

  const orders = await Promise.all(
    generatedData.map(async ({ orderData, itemData }) => {
      const order = await Order.findOne({ where: { id: orderData.id } });
      //create order and item if doesn't exist
      if (!order) {
        const newOrder = await Order.create(orderData);
        const items = await generateOrderItem(itemData, newOrder.id);
        const sortedItems = [...items].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        newOrder.items = sortedItems;
        return newOrder;
      } else return order;
    })
  );

  return orders;
};

export const generateOrderItem = async (
  creationData: OrderItemGenerationAttribute,
  optionalOrder?: OrderGenerationAttribute | string
) => {
  let orderId: string;
  if (typeof optionalOrder === "string") orderId = optionalOrder;
  else {
    const [order] = await generateOrders(
      optionalOrder ? [optionalOrder] : [{ items: [] }]
    );
    orderId = order.id;
  }

  let orderItemDatas: OrderItemCreationAttribute[];
  //generate fake data
  const createOrderItemData =
    (data?: Partial<OrderItemCreationAttribute>) =>
    (): OrderItemCreationAttribute => {
      return {
        id: data?.id ?? faker.string.uuid(),
        orderId,
        name: data?.name ?? faker.commerce.productName(),
        description: data?.description ?? faker.commerce.productDescription(),
        price: data?.price ?? faker.number.int({ min: 0, max: 100000000 }),
        quantity: data?.quantity ?? faker.number.int({ min: 0, max: 9999 }),
      };
    };

  //expand if number, complete if order data partials
  if (typeof creationData === "number")
    orderItemDatas = faker.helpers.multiple(createOrderItemData(), {
      count: creationData,
    });
  else orderItemDatas = creationData.map((data) => createOrderItemData(data)());

  const orderItemImageDatas = orderItemDatas.map(({ id }, i) => {
    // try to get image creation data, randomly create between 0 to 6 images otherwise
    const imageData: OrderItemImageGenerationAttribute =
      (typeof creationData === "number"
        ? undefined
        : creationData[i]?.images) ?? Math.floor(Math.random() * 6);
    let orderItemImageDatas: OrderItemImageCreationAttribute[];

    const createOrderItemImageData =
      (i: number, data?: Partial<OrderItemImageCreationAttribute>) =>
      (): OrderItemImageCreationAttribute => {
        return {
          orderId,
          itemId: id,
          imageName: data?.imageName ?? faker.string.uuid() + ".webp",
          order: i,
        };
      };

    if (typeof imageData === "number")
      orderItemImageDatas = Array.from({ length: imageData }).map((_, i) =>
        createOrderItemImageData(i, undefined)()
      );
    else
      orderItemImageDatas = imageData.map((data, i) =>
        createOrderItemImageData(i, data)()
      );
    return orderItemImageDatas;
  });

  const items = await OrderItem.bulkCreate(orderItemDatas);

  const completeItems = await Promise.all(
    items.map(async (item, i) => {
      const images = await OrderItemImage.bulkCreate(orderItemImageDatas[i]);
      const sortedImages = [...images].sort((a, b) => a.order - b.order);
      item.images = sortedImages;
      return item;
    })
  );

  return completeItems;
};
