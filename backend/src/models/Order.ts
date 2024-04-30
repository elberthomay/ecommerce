import {
  Table,
  Model,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  BelongsToMany,
  PrimaryKey,
  HasMany,
  Default,
  Index,
  AllowNull,
  Sequelize,
} from "sequelize-typescript";
import User from "./User";
import Shop from "./Shop";
import { OrderStatuses } from "@elycommerce/common";

export const orderOrderOptions: Record<
  string,
  [keyof OrderCreationAttribute, "ASC" | "DESC"]
> = {
  newest: ["createdAt", "DESC"],
  oldest: ["createdAt", "ASC"],
};

export interface OrderCreationAttribute {
  id?: string;
  userId: string;
  shopId: string;
  status?: OrderStatuses;

  name: string;
  image?: string;
  totalPrice: number;

  phoneNumber: string;
  longitude?: number;
  latitude?: number;
  postCode?: string;
  addressDetail: string;
  village?: string | null;
  district?: string | null;
  city: string;
  province: string;
  country: string;
  recipient: string;

  createdAt?: string;
  updatedAt?: string;
}

@Table({ tableName: "Order" })
class Order extends Model<OrderCreationAttribute> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Index
  @ForeignKey(() => Shop)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  shopId!: string;

  @Index
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.ENUM(...Object.values(OrderStatuses)),
    allowNull: false,
    defaultValue: OrderStatuses.AWAITING,
  })
  status!: OrderStatuses;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  image!: string | null;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  totalPrice!: number;

  @Column({
    type: DataType.STRING(25),
    allowNull: false,
  })
  phoneNumber!: string;

  @Column({
    type: DataType.DECIMAL(7, 4),
    allowNull: true,
    validate: { min: -90, max: 90 },
  })
  latitude!: number | null;

  @Column({
    type: DataType.DECIMAL(7, 4),

    allowNull: true,
    validate: { min: -180, max: 180 },
  })
  longitude!: number | null;

  @Column({ type: DataType.STRING(200), allowNull: false })
  addressDetail!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  village!: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  district!: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  city!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  province!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  country!: string;

  @Column({
    type: DataType.STRING(60),
    allowNull: false,
  })
  recipient!: string;

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

  @BelongsTo(() => Shop)
  shop!: Shop | null;

  @BelongsTo(() => User)
  user!: Shop | null;

  toJSON() {
    const defaultJson = super.toJSON();
    return defaultJson;
  }
}

export default Order;
