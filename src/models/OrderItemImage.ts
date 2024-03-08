import { Model, PrimaryKey, Unique } from "sequelize-typescript";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import OrderItem from "./OrderItem";
import { IncludeOptions, Includeable, Op, col } from "sequelize";

export interface OrderItemImageCreationAttribute {
  orderId: string;
  itemId: string;
  imageName: string;
  order: number;
}

@Table({ tableName: "OrderItemImage" })
class OrderItemImage extends Model<OrderItemImageCreationAttribute> {
  @PrimaryKey
  @ForeignKey(() => OrderItem)
  @Column({
    type: DataType.UUID,
    // unique: "unq-item-order-idx",
  })
  orderId!: string;

  @PrimaryKey
  @ForeignKey(() => OrderItem)
  @Column({
    type: DataType.UUID,
    // unique: "unq-item-order-idx",
  })
  itemId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  imageName!: string;

  @PrimaryKey
  @Column({
    type: DataType.INTEGER,

    // unique: "unq-item-order-idx",
  })
  order!: number;
}

export const getOrderItemImageInclude = (
  orderItemTableName: string,
  options: Omit<IncludeOptions, "model" | "on"> = {}
): Includeable => ({
  model: OrderItemImage,
  on: {
    orderId: { [Op.eq]: col(`${orderItemTableName}.orderId`) },
    itemId: { [Op.eq]: col(`${orderItemTableName}.id`) },
  },
  ...options,
});

export default OrderItemImage;
