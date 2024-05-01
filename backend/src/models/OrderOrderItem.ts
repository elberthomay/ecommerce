import { AllowNull, Model, PrimaryKey } from "sequelize-typescript";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import Order from "./Order";
import OrderItem from "./OrderItem";

interface OrderOrderItemCreationAttribute {
  orderId: string;
  itemId: string;
  version: number;
  quantity: number;
}

@Table({ tableName: "OrderOrderItem" })
class OrderOrderItem extends Model<OrderOrderItemCreationAttribute> {
  @PrimaryKey
  @ForeignKey(() => Order)
  @Column(DataType.UUID)
  orderId!: string;

  @PrimaryKey
  @ForeignKey(() => OrderItem)
  @Column(DataType.UUID)
  itemId!: string;

  @PrimaryKey
  @ForeignKey(() => OrderItem)
  @Column(DataType.INTEGER)
  version!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  quantity!: number;

  @Column({
    allowNull: false,
    type: DataType.DATE(6),
  })
  createdAt?: Date;

  @Column({
    allowNull: false,
    type: DataType.DATE(6),
  })
  updatedAt?: Date;
}

export default OrderOrderItem;
