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
import Address from "./address";
import ShopAddress from "./ShopAddress";

export interface ShopCreationAttribute {
  id?: string;
  name: string;
  userId?: string;
  user?: UserCreationAttribute;
  items?: ItemCreationAttribute[];
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
}

export default Shop;
