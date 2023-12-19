import {
  Table,
  Model,
  Column,
  HasOne,
  DataType,
  BelongsToMany,
  ForeignKey,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  Validate,
  BelongsTo,
} from "sequelize-typescript";
import Shop, { ShopCreationAttribute } from "./Shop";
import Item, { ItemCreationAttribute } from "./Item";
import Cart from "./Cart";
import Address from "./Address";
import UserAddress from "./UserAddress";

export interface UserCreationAttribute {
  id?: string;
  name: string;
  email: string;
  hash: string;
  avatar?: string;
  shop?: ShopCreationAttribute;
  selectedAddressId?: string;
  itemsInCart?: ItemCreationAttribute[];
  privilege?: 0 | 1 | 2;
}

@Table({ tableName: "User" })
class User extends Model<UserCreationAttribute> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false)
  @Column(DataType.CHAR(60))
  hash!: string;

  @AllowNull(false)
  @Default(2)
  @Validate({ isIn: [[0, 1, 2]] })
  @Column(DataType.INTEGER)
  privilege!: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  avatar!: string | null;

  @ForeignKey(() => Address)
  @AllowNull(true)
  @Unique
  @Column(DataType.UUID)
  selectedAddressId!: string;

  @BelongsTo(() => Address, {
    targetKey: "id",
    foreignKey: "selectedAddressId",
  })
  selectedAddress!: Address | null;

  @HasOne(() => Shop, { onDelete: "CASCADE" })
  shop!: Shop | null;

  @BelongsToMany(() => Item, () => Cart)
  itemsInCart!: Item[];

  @BelongsToMany(() => Address, () => UserAddress)
  addresses!: Address[];

  toJSON() {
    // Use super.toJSON() to get the default serialization
    const json = super.toJSON() as any;

    // Exclude sensitive fields
    delete json.hash;
    delete json.createdAt;
    delete json.updatedAt;
    // Add more fields to exclude as needed

    return json;
  }
}

export default User;
