import {
  Table,
  Model,
  Column,
  HasOne,
  DataType,
  BelongsToMany,
  IsUUID,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import Shop, { ShopCreationAttribute } from "./Shop";
import Item, { ItemCreationAttribute } from "./Item";
import Cart from "./Cart";

export interface UserCreationAttribute {
  name: string;
  email: string;
  hash: string;
  shop?: ShopCreationAttribute;
  itemsInCart?: ItemCreationAttribute[];
}

@Table
class User extends Model<UserCreationAttribute> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.CHAR(60),
    allowNull: false,
  })
  hash!: string;

  @HasOne(() => Shop)
  shop!: Shop | null;

  @BelongsToMany(() => Item, () => Cart)
  itemsInCart!: Item[];
}

export default User;
