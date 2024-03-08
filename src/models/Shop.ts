import {
  Table,
  Model,
  BelongsTo,
  Column,
  ForeignKey,
  DataType,
  HasMany,
  Unique,
  AllowNull,
  IsUUID,
  BelongsToMany,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import User, { UserCreationAttribute } from "./User";
import Item, { ItemCreationAttribute } from "./Item";
import Address from "./Address";
import ShopAddress from "./ShopAddress";
import Order, { OrderCreationAttribute } from "./Order";

export interface ShopCreationAttribute {
  id?: string;
  name: string;
  avatar?: string;
  description?: string;
  userId?: string;
  user?: UserCreationAttribute;
  items?: ItemCreationAttribute[];
  orders?: OrderCreationAttribute[];
}

@Table({ tableName: "Shop" })
class Shop extends Model<ShopCreationAttribute> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  avatar!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  description!: string | null;

  @ForeignKey(() => User)
  @Unique
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User)
  user!: User | null;

  @BelongsToMany(() => Address, () => ShopAddress)
  addresses!: Address[];

  @HasMany(() => Item)
  items!: Item[] | null;

  @HasMany(() => Order, { onDelete: "CASCADE" })
  orders!: Order[];
}

export default Shop;
