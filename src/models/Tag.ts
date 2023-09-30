import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
  PrimaryKey,
  AutoIncrement,
} from "sequelize-typescript";
import Item, { ItemCreationAttribute } from "./Item";
import ItemTag from "./ItemTag";

export interface TagCreationAttribute {
  id?: number;
  name: string;
  items?: ItemCreationAttribute[];
}

@Table
class Tag extends Model<TagCreationAttribute> {
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
