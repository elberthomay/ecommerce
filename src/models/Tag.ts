import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
} from "sequelize-typescript";
import Item, { ItemCreationAttribute } from "./Item";
import ItemTag from "./ItemTag";

export interface TagCreationAttribute {
  id?: number;
  name: string;
  Items?: ItemCreationAttribute[];
}

@Table
class Tag extends Model<TagCreationAttribute> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
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
