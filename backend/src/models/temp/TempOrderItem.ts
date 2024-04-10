import {
  Table,
  Model,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  HasMany,
  AllowNull,
  Default,
} from "sequelize-typescript";
import TempOrderItemImage from "./TempOrderItemImage";

interface OrderItemCreationAttribute {
  id: string;
  orderId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({ tableName: "TempOrderItem" })
class TempOrderItem extends Model<OrderItemCreationAttribute> {
  @PrimaryKey
  @Column({ type: DataType.UUID, allowNull: false })
  id!: string;

  @PrimaryKey
  @Default(1)
  @Column(DataType.INTEGER)
  version!: number;

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

  @HasMany(() => TempOrderItemImage)
  images!: TempOrderItemImage[];
}

export default TempOrderItem;
