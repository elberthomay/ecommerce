import { Op, Transaction } from "sequelize";
import Order, { OrderStatuses, orderOrderOptions } from "../Order";
import OrderItem from "../OrderItem";
import {
  formatOrderAddress,
  getOrdersOption,
  orderAddressSchema,
} from "../../schemas/orderSchema";
import OrderItemImage, { getOrderItemImageInclude } from "../OrderItemImage";
import InvalidOrderStatusError from "../../errors/invalidOrderStatusError";
import Cart from "../Cart";
import UserAddress from "../UserAddress";
import NoItemInCartError from "../../errors/NoItemInCartError";
import sequelize from "../sequelize";
import Item from "../Item";
import ItemImage from "../ItemImage";
import InventoryError from "../../errors/InventoryError";
import { z } from "zod";
import { isUndefined, omitBy } from "lodash";
import Shop from "../Shop";

export async function getOrders(options: z.infer<typeof getOrdersOption>) {
  const { userId, shopId, status, itemName, newerThan, orderBy, page, limit } =
    options;

  const whereOption = omitBy(
    {
      userId,
      shopId,
      status,
      createdAt: newerThan ? { [Op.gte]: newerThan } : undefined,
    },
    isUndefined
  );
  console.log(whereOption);
  const orders = await Order.findAll({
    where: whereOption,
    include: [
      Shop,
      {
        model: OrderItem,
        attributes: ["id", "orderId", "name", "price", "quantity"],
        where: itemName
          ? {
              name: { [Op.substring]: itemName },
            }
          : undefined, // inner join intended
        include: [
          getOrderItemImageInclude("items", {
            where: { order: 0 },
            required: false,
          }),
        ],
      },
    ],
    order: [orderOrderOptions[orderBy ?? "newest"]],
    limit,
    offset: limit * (page - 1),
  });
  return orders;
}

export async function cancelOrder(
  order: Order,
  side?: "shop" | "user"
): Promise<Order> {
  if (order.status === OrderStatuses.AWAITING) {
    return await order.update({ status: OrderStatuses.CANCELLED });
  } else if (order.status === OrderStatuses.CONFIRMED) {
    if (side === "shop")
      return await order.update({ status: OrderStatuses.CANCELLED });
    else
      throw new InvalidOrderStatusError(
        "Order could only be cancelled by user if it has yet to be confirmed"
      );
  } else {
    throw new InvalidOrderStatusError(
      "Order could only be cancelled if it has yet to be delivered"
    );
  }
}

export async function confirmOrder(order: Order) {
  if (order.status === OrderStatuses.AWAITING) {
    return await order.update({ status: OrderStatuses.CONFIRMED });
  } else
    throw new InvalidOrderStatusError(
      "Order could only be confirmed if it has yet to be confirmed"
    );
}

export async function deliverOrder(order: Order) {
  if (order.status === OrderStatuses.CONFIRMED) {
    return await order.update({ status: OrderStatuses.DELIVERING });
  } else
    throw new InvalidOrderStatusError(
      "Order could only be delivered if it is currently confirmed"
    );
}

/**
 * Create orders for cart items
 * @param cartItems cart items to be processed
 * @param address address of user, Address have to be eagerly loaded
 * @throws Error: eagerly loaded values unavailable
 * @throws InventoryError: some or all item out of stock
 */
export async function createOrders(cartItems: Cart[], address: UserAddress) {
  if (cartItems.length === 0) throw new NoItemInCartError();
  const addressData = formatOrderAddress.safeParse(address.address);
  const userId = address.userId;
  if (!addressData.success)
    throw new Error("createOrder: address is not eagerly loaded");

  // start transaction
  return await sequelize.transaction(async (transaction) => {
    // reload items to gain lock
    await Promise.all(
      cartItems.map((cartItem) =>
        cartItem.reload({
          include: [{ model: Item, include: [ItemImage] }],
          transaction,
          lock: true,
        })
      )
    );

    // find items out of stock
    const outOfStockCarts = cartItems.filter((cartItem) => {
      if (cartItem?.item && cartItem.item?.images)
        return cartItem.quantity > cartItem?.item?.quantity;
      else throw new Error("createOrder: item and image not eagerly loaded");
    });

    if (outOfStockCarts.length === 0) {
      // group cart items by shopId
      const cartsByShop = Object.entries(
        cartItems.reduce((cartsByShop, cartItem) => {
          const shopId = cartItem.item?.shopId!;
          return {
            ...cartsByShop,
            // add cart to property if exist, create new one if not
            [shopId]: cartsByShop[shopId]
              ? [...cartsByShop[shopId], cartItem]
              : [cartItem],
          };
        }, {} as Record<string, Cart[]>)
      );

      // create order for each shop
      return await Promise.all(
        cartsByShop.map(([shopId, cartItems]) =>
          createOrder(cartItems, addressData.data, userId, transaction)
        )
      );
    } //some item out of stock
    else
      throw new InventoryError(
        outOfStockCarts.map(({ quantity, item }) => ({
          id: item?.id ?? "", // undefined shouldn't happen
          name: item?.name ?? "",
          quantity,
        }))
      );
  });
}

/**
 * Create order, assume all cartItems belong to the same shop, and each items are available
 * @param cartItems cart item to be processed
 * @param addressData
 * @param transaction
 * @returns
 */
async function createOrder(
  cartItems: Cart[],
  addressData: z.infer<typeof orderAddressSchema>,
  userId: string,
  transaction: Transaction
): Promise<Order> {
  if (cartItems.length === 0)
    throw Error("Order.createOrder: creating order with no item");

  const shopId = cartItems[0].item!.shopId;

  // create the order
  const order = await Order.create(
    {
      userId,
      shopId,
      ...addressData,
    },
    { transaction }
  );
  await order.reload({ include: Shop, transaction });

  order.items = await Promise.all(
    cartItems.map(async ({ quantity, item }) => {
      const { id, name, description, price, images } = item!;
      if (images === undefined) throw Error("images not eagerly loaded");
      const createdItem = await OrderItem.create(
        {
          orderId: order.id,
          id,
          name,
          description,
          price,
          quantity,
        },
        { transaction }
      );
      const createdImages = await OrderItemImage.bulkCreate(
        images.map(({ itemId, imageName, order: imageOrder }) => ({
          orderId: order.id,
          itemId,
          imageName,
          order: imageOrder,
        })),
        { transaction }
      );
      createdItem.images = createdImages;
      return createdItem;
    })
  );

  //change item quantity and destroy cart
  await Promise.all(
    cartItems.map(async (cartItem) => {
      const { quantity, item } = cartItem;

      await item?.update(
        { quantity: item.quantity - quantity },
        { transaction }
      );
      await cartItem.destroy({ transaction });
    })
  );

  return order;
}
