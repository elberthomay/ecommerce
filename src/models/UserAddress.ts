import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  Unique,
} from "sequelize-typescript";
import User from "./User";
import Address from "./address";

interface UserAddressCreationAttribute {
  userId: string;
  addressId: string;
}

@Table
class UserAddress extends Model<UserAddressCreationAttribute> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID })
  userId!: string;

  @Unique //address could only belong to one user
  @ForeignKey(() => Address)
  @Column({ type: DataType.UUID, unique: true })
  addressId!: string;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Address)
  address!: Address;
}

export default UserAddress;
