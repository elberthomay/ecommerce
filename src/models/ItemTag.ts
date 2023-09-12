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
import Item from "./Item";

@Table
class ItemTag extends Model {
  @ForeignKey(() => Item)
  @Column
  itemId!: string;

  @ForeignKey(() => Tag)
  @Column
  tagId!: number;
}

export default ItemTag;
