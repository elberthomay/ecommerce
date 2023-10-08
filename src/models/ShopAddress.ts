import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
  Unique,
} from "sequelize-typescript";
import Shop from "./Shop";
import Address from "./Address";

interface ShopAddressCreationAttribute {
  shopId: string;
  addressId: string;
  selected?: boolean;
}

@Table
class ShopAddress extends Model<ShopAddressCreationAttribute> {
  @ForeignKey(() => Shop)
  @Column(DataType.UUID)
  shopId!: string;

  @ForeignKey(() => Address)
  @Unique
  @Column(DataType.UUID)
  addressId!: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  selected!: boolean;

  @BelongsTo(() => Shop)
  shop!: Shop;

  @BelongsTo(() => Address)
  address!: Address;
}

export default ShopAddress;
