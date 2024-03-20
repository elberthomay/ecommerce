import { Includeable, Op, Transaction } from "sequelize";
import Order, { orderOrderOptions } from "../Order";
import { OrderStatuses } from "@elycommerce/common";
import OrderItem from "../OrderItem";
import {
  formatOrderAddress,
  getOrdersOption,
  orderAddressSchema,
} from "@elycommerce/common";
import OrderItemImage, { getOrderItemImageInclude } from "../OrderItemImage";
import InvalidOrderStatusError from "../../errors/InvalidOrderStatusError";
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
import {
  setCancelOrderTimeout,
  setDeliverOrder,
} from "../../agenda/orderAgenda";
import {
  AWAITING_CONFIRMATION_TIMEOUT_MINUTE,
  CONFIRMED_TIMEOUT_MINUTE,
  DELIVERY_TIMEOUT_MINUTE,
} from "../../var/constants";
import { addMinutes } from "date-fns";

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
  const includeOption: Includeable[] = [Shop];
  if (itemName)
    includeOption.push({
      model: OrderItem,
      attributes: ["id"],
      where: {
        name: { [Op.substring]: itemName },
      }, // inner join intended
    });
  const orders = await Order.findAll({
    where: whereOption,
    include: includeOption,
    order: [orderOrderOptions[orderBy ?? "newest"]],
    limit,
    offset: limit * (page - 1),
  });
  return orders;
}

export async function getOrderDetail(orderId: string) {
  const order = await Order.findOne({
    where: { id: orderId },
    include: [
      Shop,
      {
        model: OrderItem,
        attributes: ["id", "orderId", "name", "price", "quantity"],
        include: [
          getOrderItemImageInclude("items", {
            where: { order: 0 },
            required: false,
          }),
        ],
      },
    ],
    order: [["items", "name", "ASC"]],
  });
  return order;
}

/**
 *
 * @param orderId Id of order to be changes
 * @param newStatus Status to be changed into
 * @param checker Function checking if current status is valid
 * @param onSuccess Function run after changing status, throwing error inside would rollback transaction
 * @returns Updated Order instance, no assossiation is eagerly loaded
 */
async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatuses,
  checker: (oldStatus: OrderStatuses) => string | true,
  onSuccess?: (order: Order, transaction?: Transaction) => any
) {
  return sequelize.transaction(async (transaction) => {
    const lockedOrder = await Order.findOne({
      where: { id: orderId },
      transaction,
      lock: true,
    });
    if (!lockedOrder) throw Error("updateOrderStatus: order does not exist");
    // checker return string if error happen
    const checkerResult = checker(lockedOrder.status);
    if (checkerResult === true) {
      await lockedOrder!.update({ status: newStatus }, { transaction });
      await onSuccess?.(lockedOrder, transaction); //run and await onSuccess if exist
      return lockedOrder;
    } else throw new InvalidOrderStatusError(checkerResult);
  });
}

async function reloadOrder(order: Order) {
  await order.reload({
    include: [
      Shop,
      {
        model: OrderItem,
        attributes: ["id", "name", "price", "quantity"],
        include: [getOrderItemImageInclude("items")],
      },
    ],
    order: [
      sequelize.literal("`items`.`name` ASC"),
      sequelize.literal("`items->images`.`order` ASC"),
      // [OrderItem, "name", "ASC"],
      // ["items.images", "order", "ASC"],
    ],
  });
}

export async function confirmOrder(order: Order) {
  const updatedOrder = await updateOrderStatus(
    order.id,
    OrderStatuses.CONFIRMED,
    (currentStatus) => {
      if (currentStatus === OrderStatuses.AWAITING) return true;
      else return "Order could only be confirmed if it has yet to be confirmed";
    },
    ({ id, status, updatedAt }) =>
      setCancelOrderTimeout(
        id,
        addMinutes(updatedAt!, CONFIRMED_TIMEOUT_MINUTE),
        status
      )
  );
  await reloadOrder(updatedOrder);
  return updatedOrder;
}

export async function cancelOrder(order: Order, side?: "shop" | "user") {
  const updatedOrder = await updateOrderStatus(
    order.id,
    OrderStatuses.CANCELLED,
    (currentStatus) => {
      if (
        currentStatus === OrderStatuses.AWAITING ||
        (currentStatus === OrderStatuses.CONFIRMED && side === "shop")
      )
        return true;
      else if (currentStatus === OrderStatuses.CONFIRMED && side === "user")
        return "Order could only be cancelled by user if it has yet to be confirmed";
      else return "Order could only be cancelled if it has yet to be delivered";
    }
  );
  await reloadOrder(updatedOrder);
  return updatedOrder;
}

export async function deliverOrder(order: Order) {
  const updatedOrder = await updateOrderStatus(
    order.id,
    OrderStatuses.DELIVERING,
    (currentStatus) => {
      if (currentStatus === OrderStatuses.CONFIRMED) return true;
      else return "Order could only be delivered if it is currently confirmed";
    },
    async ({ id, createdAt, updatedAt }) => {
      // set timeout
      await setDeliverOrder(
        id,
        addMinutes(updatedAt!, DELIVERY_TIMEOUT_MINUTE)
      );
    }
  );
  await reloadOrder(updatedOrder);
  return updatedOrder;
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
      const orders = await Promise.all(
        cartsByShop.map(([shopId, cartItems]) =>
          createOrder(cartItems, addressData.data, userId, transaction)
        )
      );

      // set timeout
      await Promise.all(
        orders.map(async ({ id, status, createdAt }) => {
          if (!createdAt) throw Error("processOrder: createdAt not loaded");
          await setCancelOrderTimeout(
            id,
            addMinutes(createdAt, AWAITING_CONFIRMATION_TIMEOUT_MINUTE),
            status
          );
        })
      );

      return orders;
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

  //sort items ascending by item name
  const sortedItems = cartItems
    .map((cart) => cart.item)
    .sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
  const totalPrice = cartItems.reduce(
    (sum, { quantity, item }) => sum + quantity * (item?.price ?? 0),
    0
  );

  // create the order
  const order = await Order.create(
    {
      userId,
      shopId,
      ...addressData,
      name: sortedItems[0]?.name!,
      totalPrice,
      image: sortedItems[0]?.images[0]?.imageName,
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
