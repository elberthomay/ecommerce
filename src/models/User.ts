import {
  Table,
  Model,
  Column,
  HasOne,
  DataType,
  BelongsToMany,
} from "sequelize-typescript";
import Shop, { ShopCreationAttribute } from "./Shop";
import Item, { ItemCreationAttribute } from "./Item";
import Cart from "./Cart";

export interface UserCreationAttribute {
  id?: string;
  name: string;
  email: string;
  hash: string;
  shop?: ShopCreationAttribute;
  itemsInCart?: ItemCreationAttribute[];
  privilege?: 0 | 1 | 2;
}

@Table({ tableName: "User" })
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

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 2,
    validate: { isIn: [[0, 1, 2]] },
  })
  privilege!: number;

  @HasOne(() => Shop)
  shop!: Shop | null;

  @BelongsToMany(() => Item, () => Cart)
  itemsInCart!: Item[];

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
