import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import Item from "./Item";
import User from "./User";

interface CartCreationAttribute {
  userId: string;
  itemId: string;
  quantity?: number;
  selected?: boolean;
}

@Table
class Cart extends Model<CartCreationAttribute> {
  @ForeignKey(() => User)
  @Column
  userId!: string;

  @ForeignKey(() => Item)
  @Column
  itemId!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  })
  quantity!: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  selected!: boolean;

  @BelongsTo(() => Item)
  item!: Item | null;

  @BelongsTo(() => User)
  user!: User | null;
}

export default Cart;
