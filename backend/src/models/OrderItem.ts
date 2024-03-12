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
import OrderItemImage, { getOrderItemImageInclude } from "./OrderItemImage";
import { z } from "zod";
import { orderItemOutputSchema } from "../schemas/orderSchema";
import Order from "./Order";

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
class OrderItem extends Model<OrderItemCreationAttribute> {
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

export async function getOrderItem(
  orderId: string,
  itemId: string
): Promise<OrderItem> {
  const orderItem = await OrderItem.findOne({
    where: { orderId, id: itemId },
    include: [getOrderItemImageInclude(OrderItem.tableName)],
  });
  if (orderItem) return orderItem;
  else throw new NotFoundError("OrderItem");
}

export default OrderItem;
