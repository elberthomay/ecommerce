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

export interface TempOrderItemImageCreationAttribute {
  itemId: string;
  version: number;
  order: number;
  imageName: string;
}

@Table({ tableName: "TempOrderItemImage" })
class TempOrderItemImage extends Model<TempOrderItemImageCreationAttribute> {
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

export const getTempOrderItemImageInclude = (
  tempOrderItemTableName: string,
  options: Omit<IncludeOptions, "model" | "on"> = {}
): Includeable => ({
  model: TempOrderItemImage,
  as: "images",
  on: {
    itemId: { [Op.eq]: col(`${tempOrderItemTableName}.id`) },
    version: { [Op.eq]: col(`${tempOrderItemTableName}.version`) },
  },
  ...options,
});

export default TempOrderItemImage;
