import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
  PrimaryKey,
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
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
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
