import { AllowNull, HasOne, Model, PrimaryKey } from "sequelize-typescript";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import TempOrderItem from "./TempOrderItem";
import Order, { OrderAttribute } from "../Order";
import { IncludeOptions, Includeable, Op, col } from "sequelize";

interface OrderOrderItemAttribute {
  orderId: string;
  itemId: string;
  version: number;
  order?: OrderAttribute;
}

interface OrderOrderItemCreationAttribute {
  orderId: string;
  itemId: string;
  version: number;
}

@Table({ tableName: "OrderOrderItem" })
class OrderOrderItem extends Model<
  OrderOrderItemAttribute,
  OrderOrderItemCreationAttribute
> {
  @PrimaryKey
  @ForeignKey(() => Order)
  @Column(DataType.UUID)
  orderId!: string;

  @PrimaryKey
  @ForeignKey(() => TempOrderItem)
  @Column(DataType.UUID)
  itemId!: string;

  @PrimaryKey
  @ForeignKey(() => TempOrderItem)
  @Column(DataType.INTEGER)
  version!: number;

  @BelongsTo(() => Order, { onDelete: "CASCADE" })
  order!: Order;
}

export const getOrderInclude = (
  orderOrderItemTableName: string,
  options: Omit<IncludeOptions, "model" | "on"> = {}
): Includeable => ({
  model: Order,
  on: {
    id: { [Op.eq]: col(`${orderOrderItemTableName}.orderId`) },
  },
  ...options,
});

export default OrderOrderItem;
