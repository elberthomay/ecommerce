import {
  Table,
  Model,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  HasMany,
} from "sequelize-typescript";
import NotFoundError from "../errors/NotFoundError";
import OrderItemImage, {
  OrderItemImageCreationAttribute,
  getOrderItemImageInclude,
} from "./OrderItemImage";
import Order, { OrderAttribute } from "./Order";
import Shop from "./Shop";
import TempOrderItem from "./temp/TempOrderItem";
import OrderOrderItem, { getOrderInclude } from "./temp/OrderOrderItem";
import { formatOrderItem, orderItemOutputSchema } from "@elycommerce/common";
import { z } from "zod";
import { getTempOrderItemImageInclude } from "./temp/TempOrderItemImage";

export interface OrderItemAttribute {
  id: string;
  orderId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  order?: OrderAttribute;
  images?: OrderItemImageCreationAttribute[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemCreationAttribute {
  id: string;
  orderId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({ tableName: "OrderItem" })
class OrderItem extends Model<OrderItemAttribute, OrderItemCreationAttribute> {
  @PrimaryKey
  @Column({ type: DataType.UUID, allowNull: false })
  id!: string;

  @PrimaryKey
  @ForeignKey(() => Order)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  orderId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  description!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  price!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quantity!: number;

  @Column({
    allowNull: false,
    type: DataType.DATE(6),
  })
  createdAt?: string;

  @Column({
    allowNull: false,
    type: DataType.DATE(6),
  })
  updatedAt?: string;

  @BelongsTo(() => Order)
  order!: Order;

  @HasMany(() => OrderItemImage)
  images!: OrderItemImage[];

  toJSON() {
    const defaultJson = super.toJSON();
    return defaultJson;
  }
}

function formatOrderItemFunc(orderItem: {
  price: number;
  createdAt: string;
  id: string;
  name: string;
  description: string;

  quantity: number;
  images?: {
    imageName: string;
    order: number;
  }[];
  order?: { shopId: string; shop?: { name: string } };
}): z.infer<typeof orderItemOutputSchema> {
  const { images, order, ...filteredItem } = orderItem;
  if (images === undefined || !order || !order.shop)
    throw new Error("formatOrderItemFunc: images, order or shop not loaded");
  return {
    ...filteredItem,
    shopId: order.shopId,
    shopName: order.shop?.name,
    images,
  };
}

export async function getOrderItem(
  orderId: string,
  itemId: string
): Promise<z.infer<typeof orderItemOutputSchema>> {
  const orderItem = await OrderItem.findOne({
    where: { orderId, id: itemId },
    include: [
      {
        model: Order,
        attributes: ["shopId"],
        include: [{ model: Shop, attributes: ["name"] }],
      },
      getOrderItemImageInclude(OrderItem.tableName),
    ],
    order: [["images", "order", "ASC"]],
  });

  const orderOrderItem = await OrderOrderItem.findOne({
    where: { orderId, itemId },
    include: [
      getOrderInclude(OrderOrderItem.tableName, {
        include: [{ model: Shop, attributes: ["name"] }],
      }),
    ],
  });

  const newOrderItem = orderOrderItem
    ? await TempOrderItem.findOne({
        where: { id: itemId, version: orderOrderItem.version },
        include: [getTempOrderItemImageInclude(TempOrderItem.tableName)],
        order: [["images", "order", "ASC"]],
      })
    : null;

  if (orderItem || newOrderItem)
    return formatOrderItemFunc(
      orderItem?.toJSON() ?? {
        ...newOrderItem!.toJSON(),
        order: orderOrderItem?.order.toJSON(),
      }
    );
  else throw new NotFoundError("OrderItem");
}

export default OrderItem;
