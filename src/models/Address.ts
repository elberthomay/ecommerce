import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  Model,
  Table,
} from "sequelize-typescript";
import Subdistrict from "./Subdistrict";
import UserAddress from "./UserAddress";
import ShopAddress from "./ShopAddress";

export interface AddressCreationAttribute {
  id: string;
  longitude?: number;
  latitude?: number;
  postCode?: string;
  detail: string;
  subdistrictId?: number;
}

@Table
class Address extends Model<AddressCreationAttribute> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.DECIMAL(7, 4),
    allowNull: true,
    validate: { min: -90, max: 90 },
  })
  latitude!: number | null;

  @Column({
    type: DataType.DECIMAL(7, 4),

    allowNull: true,
    validate: { min: -180, max: 180 },
  })
  longitude!: number | null;

  @Column({ type: DataType.CHAR(10), allowNull: true })
  postCode!: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  detail!: string;

  @Column({ type: DataType.DATE(6) })
  createdAt?: string;

  @Column({ type: DataType.DATE(6) })
  updatedAt?: string;

  @ForeignKey(() => Subdistrict)
  @Column({ type: DataType.INTEGER, allowNull: true })
  subdistrictId!: number | null;

  @BelongsTo(() => Subdistrict)
  subdistrict!: Subdistrict | null;

  @HasOne(() => UserAddress, { onDelete: "CASCADE" })
  userAddress!: UserAddress | null;

  @HasOne(() => ShopAddress, { onDelete: "CASCADE" })
  shopAddress!: ShopAddress | null;
}

export default Address;
