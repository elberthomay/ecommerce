import {
  Table,
  Model,
  Column,
  DataType,
  BelongsToMany,
  PrimaryKey,
  AutoIncrement,
  HasMany,
  AllowNull,
  Unique,
  Validate,
} from "sequelize-typescript";
import Subdistrict from "./Subdistrict";

export interface cityCreationAttribute {
  id?: number;
  name: string;
  longitude: number;
  latitude: number;
}

@Table
class City extends Model<cityCreationAttribute> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Unique
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

  @HasMany(() => Subdistrict)
  subdistricts!: Subdistrict[];
}

export default City;
