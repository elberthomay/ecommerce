import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import Subdistrict from "./Subdistrict";

interface AddressCreationAttribute {
  id: string;
  longitude: number;
  latitude: number;
  postCode?: string;
  detail?: string;
  subdistrictId: number;
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
    allowNull: false,
    validate: { min: -90, max: 90 },
  })
  latitude!: number;

  @Column({
    type: DataType.DECIMAL(7, 4),
    allowNull: false,
    validate: { min: -180, max: 180 },
  })
  longitude!: number;

  @Column({ type: DataType.CHAR(10) })
  postCode!: string;

  @Column({ type: DataType.STRING })
  detail!: string;

  @ForeignKey(() => Subdistrict)
  @Column({ type: DataType.INTEGER, allowNull: false })
  subdistrictId!: number;

  @BelongsTo(() => Subdistrict)
  subdistrict!: Subdistrict;
}

export default Address;
