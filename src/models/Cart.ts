import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
  ForeignKey,
} from "sequelize-typescript";
import Item from "./Item";
import User from "./User";

@Table
class Cart extends Model {
  @ForeignKey(() => User)
  @Column
  userId!: string;

  @ForeignKey(() => Item)
  @Column
  ItemId!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  })
  quantity!: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  selected!: boolean;
}

export default Cart;
