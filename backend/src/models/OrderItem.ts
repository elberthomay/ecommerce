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
import OrderItemImage from "./OrderItemImage";

export interface OrderItemCreationAttribute {
  id: string;
  version: number;
  name: string;
  description: string;
  price: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({ tableName: "OrderItem" })
class OrderItem extends Model<OrderItemCreationAttribute> {
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
    allowNull: false,
    type: DataType.DATE(6),
  })
  createdAt?: string;

  @Column({
    allowNull: false,
    type: DataType.DATE(6),
  })
  updatedAt?: string;

  @HasMany(() => OrderItemImage)
  images!: OrderItemImage[];
}

export default OrderItem;
