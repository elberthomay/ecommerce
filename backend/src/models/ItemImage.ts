import { Model, Unique } from "sequelize-typescript";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from "sequelize-typescript";
import Item, { ItemAttribute } from "./Item";

export interface ItemImageAttribute {
  itemId: string;
  imageName: string;
  order: number;
  parentItem?: ItemAttribute;
}

export interface ItemImageCreationAttribute {
  itemId?: string;
  imageName: string;
  order: number;
}

@Table
class ItemImage extends Model<ItemImageAttribute, ItemImageCreationAttribute> {
  @Index({
    name: "unq-order-idx",
    type: "UNIQUE",
  })
  @Index
  @ForeignKey(() => Item)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
  })
  itemId!: string;

  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  imageName!: string;

  @Index({
    name: "unq-order-idx",
    type: "UNIQUE",
  })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  order!: number;

  @BelongsTo(() => Item)
  parentItem!: Item;
}

export default ItemImage;
