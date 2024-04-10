import {
  AllowNull,
  Default,
  Model,
  PrimaryKey,
  Unique,
} from "sequelize-typescript";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import TempOrderItem from "./TempOrderItem";
import { IncludeOptions, Includeable, Op, col } from "sequelize";

interface OrderItemImageCreationAttribute {
  itemId: string;
  version: number;
  order: number;
  imageName: string;
}

@Table({ tableName: "TempOrderItemImage" })
class TempOrderItemImage extends Model<OrderItemImageCreationAttribute> {
  @PrimaryKey
  @ForeignKey(() => TempOrderItem)
  @Column({
    type: DataType.UUID,
    // unique: "unq-item-order-idx",
  })
  itemId!: string;

  @PrimaryKey
  @ForeignKey(() => TempOrderItem)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  version!: number;

  @PrimaryKey
  @Column({
    type: DataType.INTEGER,

    // unique: "unq-item-order-idx",
  })
  order!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  imageName!: string;
}

export const getOrderItemImageInclude = (
  orderItemTableName: string,
  options: Omit<IncludeOptions, "model" | "on"> = {}
): Includeable => ({
  model: TempOrderItemImage,
  on: {
    orderId: { [Op.eq]: col(`${orderItemTableName}.orderId`) },
    version: { [Op.eq]: col(`${orderItemTableName}.version`) },
  },
  ...options,
});

export default TempOrderItemImage;
