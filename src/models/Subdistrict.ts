import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Validate,
} from "sequelize-typescript";
import City from "./City";
import Address from "./address";

interface SubdistrictCreationAttribute {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  postCodes: string;
  cityId: number;
}

@Table
class Subdistrict extends Model<SubdistrictCreationAttribute> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Validate({ min: -90, max: 90 })
  @Column(DataType.DECIMAL(7, 4))
  latitude!: number;

  @AllowNull(false)
  @Validate({ min: -180, max: 180 })
  @Column(DataType.DECIMAL(7, 4))
  longitude!: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  postCodes!: string;

  @ForeignKey(() => City)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  cityId!: number;

  @BelongsTo(() => City)
  City!: City;

  @HasMany(() => Address)
  Addresses!: Address[];
}

export default Subdistrict;
