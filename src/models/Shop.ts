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
} from "sequelize-typescript";
import User, { UserCreationAttribute } from "./User";
import Item, { ItemCreationAttribute } from "./Item";

export interface ShopCreationAttribute {
  id?: string;
  name: string;
  userId?: string;
  user?: UserCreationAttribute;
  items?: ItemCreationAttribute[];
}

@Table({ tableName: "Shop" })
class Shop extends Model<ShopCreationAttribute> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @ForeignKey(() => User)
  @Unique
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User)
  user!: User | null;

  @HasMany(() => Item)
  items!: Item[] | null;
}

export default Shop;
