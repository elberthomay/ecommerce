import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
  PrimaryKey,
  AutoIncrement,
} from "sequelize-typescript";
import Item, { ItemAttribute, ItemCreationAttribute } from "./Item";
import ItemTag from "./ItemTag";

export interface TagAttribute {
  id: number;
  name: string;
  items?: ItemAttribute[];
}

export interface TagCreationAttribute {
  id?: number;
  name: string;
  items?: ItemCreationAttribute[];
}

@Table({ tableName: "Tag" })
class Tag extends Model<TagAttribute, TagCreationAttribute> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name!: string;

  @BelongsToMany(() => Item, () => ItemTag)
  items!: Item[];
}

export default Tag;
