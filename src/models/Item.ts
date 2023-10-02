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
} from "sequelize-typescript";
import Shop, { ShopCreationAttribute } from "./Shop";
import Tag, { TagCreationAttribute } from "./Tag";
import ItemTag from "./ItemTag";
import User, { UserCreationAttribute } from "./User";
import Cart from "./Cart";

export interface ItemCreationAttribute {
  id?: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  shopId?: string;
  inStock?: boolean;
  shop?: ShopCreationAttribute;
  tags?: TagCreationAttribute[];
  inCartUsers?: UserCreationAttribute[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({ tableName: "Item" })
class Item extends Model<ItemCreationAttribute> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

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
    validate: { min: 0 },
    defaultValue: 0,
  })
  quantity!: number;

  @ForeignKey(() => Shop)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  shopId!: string;

  @Column({
    type: "BOOLEAN AS (quantity != 0)",
    set() {
      throw new Error("Virtual column cannot be set");
    },
  })
  inStock!: boolean;

  @BelongsTo(() => Shop)
  shop!: Shop | null;

  @BelongsToMany(() => Tag, () => ItemTag)
  tags!: Tag[];

  @BelongsToMany(() => User, () => Cart)
  inCartUsers!: User[];

  toJSON() {
    const defaultJson = super.toJSON();
    delete defaultJson.inStock;
    return defaultJson;
  }
}

export default Item;
