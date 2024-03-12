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
import Shop, { ShopCreationAttribute } from "./Shop";
import Tag, { TagCreationAttribute } from "./Tag";
import ItemTag from "./ItemTag";
import User, { UserCreationAttribute } from "./User";
import Cart from "./Cart";
import ItemImage from "./ItemImage";

export interface ItemCreationAttribute {
  id?: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  shopId?: string;
  shop?: ShopCreationAttribute;
  tags?: TagCreationAttribute[];
  inCartUsers?: UserCreationAttribute[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({ tableName: "Item" })
class Item extends Model<ItemCreationAttribute> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Index({
    name: "name-idx",
    type: "FULLTEXT",
  })
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
    allowNull: false,
    type: DataType.DATE(6),
  })
  createdAt?: string;

  @Column({
    allowNull: false,
    type: DataType.DATE(6),
  })
  updatedAt?: string;

  @HasMany(() => ItemImage)
  images!: ItemImage[];

  @BelongsTo(() => Shop)
  shop!: Shop | null;

  @BelongsToMany(() => Tag, () => ItemTag)
  tags!: Tag[];

  @BelongsToMany(() => User, () => Cart)
  inCartUsers!: User[];

  toJSON() {
    const defaultJson = super.toJSON();
    return defaultJson;
  }
}

export default Item;
