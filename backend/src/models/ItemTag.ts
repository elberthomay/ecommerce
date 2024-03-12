import {
  Table,
  Model,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  BelongsToMany,
} from "sequelize-typescript";
import Shop from "./Shop";
import Tag from "./Tag";
import Item, { ItemCreationAttribute } from "./Item";

export interface ItemTagCreationAttribute {
  itemId?: string;
  tagId: number;
  item?: ItemCreationAttribute;
  tag?: ItemCreationAttribute;
}

@Table({ tableName: "ItemTag" })
class ItemTag extends Model<ItemTagCreationAttribute> {
  @ForeignKey(() => Item)
  @Column
  itemId!: string;

  @ForeignKey(() => Tag)
  @Column
  tagId!: number;
}

export default ItemTag;
