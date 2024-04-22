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
import TempOrderItem from "../temp/TempOrderItem";
import OrderOrderItem from "../temp/OrderOrderItem";
import TempOrderItemImage from "../temp/TempOrderItemImage";
import { getOrderDetailWithOldItemQuery } from "../../kysely/queries/orderQueries";
import NotFoundError from "../../errors/NotFoundError";

function getOrderTimeout(status: string, updatedAt: Date) {
  const timeoutMinute =
    status === OrderStatuses.AWAITING
      ? AWAITING_CONFIRMATION_TIMEOUT_MINUTE
      : status === OrderStatuses.CONFIRMED
      ? CONFIRMED_TIMEOUT_MINUTE
      : undefined;
  const timeout = timeoutMinute
    ? addMinutes(updatedAt, timeoutMinute)
    : undefined;
  return timeout;
}

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
  const order = await getOrderDetailWithOldItemQuery(
    orderId
  ).executeTakeFirst();
  if (!order) throw new NotFoundError("Order");

  const timeout = getOrderTimeout(order.status, order.updatedAt)?.toISOString();
  return {
    ...order,
    timeout,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    status: order.status as OrderStatuses,
    longitude: Number(order.longitude),
    latitude: Number(order.latitude),
  };
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

    if (outOfStockCarts.length !== 0) {
      throw new InventoryError(
        outOfStockCarts.map(({ quantity, item }) => ({
          id: item?.id ?? "", // undefined shouldn't happen
          name: item?.name ?? "",
          quantity,
        }))
      );
    }

    // group cart items by shopId
    const cartsByShop = Object.entries(
      cartItems.reduce((cartsByShop, cartItem) => {
        const shopId = cartItem.item?.shopId!;
        // add cart to property if exist, create new one if not
        cartsByShop[shopId] = cartsByShop[shopId]
          ? [...cartsByShop[shopId], cartItem]
          : [cartItem];
        return cartsByShop;
      }, {} as Record<string, Cart[]>)
    );

    // create order for each shop
    const orders = await Promise.all(
      cartsByShop.map(([shopId, cartItems]) =>
        createOrder(cartItems, addressData.data, userId, shopId, transaction)
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
  });
}

/**
 * Create order, assume all cartItems belong to the same shop, and each items are available
 * @param cartItems cart item to be processed
 * @param addressData
 * @param transaction
 * @returns order id of created order.
 */
async function createOrder(
  cartItems: Cart[],
  addressData: z.infer<typeof orderAddressSchema>,
  userId: string,
  shopId: string,
  transaction: Transaction
): Promise<Order> {
  if (cartItems.length === 0)
    throw Error("Order.createOrder: creating order with no item");

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

  await Promise.all(
    cartItems.map(async ({ quantity, item }) => {
      const { id, name, description, price, images, version } = item!;
      if (images === undefined) throw Error("images not eagerly loaded");
      const [createdItem, created] = await TempOrderItem.findOrCreate({
        where: { id, version },
        defaults: {
          id,
          version,
          name,
          description,
          price,
        },
        transaction,
      });
      if (created)
        await TempOrderItemImage.bulkCreate(
          images.map(({ itemId, imageName, order: imageOrder }) => ({
            itemId,
            version,
            imageName,
            order: imageOrder,
          })),
          { transaction }
        );

      await OrderOrderItem.create(
        {
          orderId: order.id,
          itemId: id,
          version,
          quantity,
        },
        { transaction }
      );
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
