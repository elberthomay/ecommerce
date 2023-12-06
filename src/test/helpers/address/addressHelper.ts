import { Model } from "sequelize-typescript";
import Address, { AddressCreationAttribute } from "../../../models/address";
import { faker } from "@faker-js/faker";

export interface ModelWithAddresses extends Model {
  addresses: Address[];
}

export const createAddressData =
  (data?: Partial<AddressCreationAttribute>) =>
  (): AddressCreationAttribute => {
    return {
      id: data?.id ?? faker.string.uuid(),
      longitude: data?.longitude ?? faker.location.longitude(),
      latitude: data?.latitude ?? faker.location.latitude(),
      postCode:
        data?.postCode ??
        faker.number.int({ min: 10000, max: 99999 }).toString(),
      detail:
        data?.detail ??
        faker.location.streetAddress({ useFullAddress: true }) +
          " " +
          faker.location.secondaryAddress(),
    };
  };

export const createAddress = async <T extends ModelWithAddresses>(
  creationData: number | Partial<AddressCreationAttribute>[],
  parentInstance: T
) => {
  let addressDatas: AddressCreationAttribute[];

  if (typeof creationData === "number")
    addressDatas = faker.helpers.multiple(createAddressData(), {
      count: creationData,
    });
  else addressDatas = creationData.map((data) => createAddressData(data)());

  const records = await Promise.all(
    addressDatas.map((data) => parentInstance.$create<Address>("address", data))
  );
  return records;
};
