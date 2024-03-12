import { Model } from "sequelize-typescript";
import Address, { AddressCreationAttribute } from "../../../models/Address";
import { faker } from "@faker-js/faker";

export interface ModelWithAddresses extends Model {
  addresses: Address[];
}

export const createAddressData =
  (data?: Partial<AddressCreationAttribute>) =>
  (): AddressCreationAttribute => {
    return {
      id: data?.id ?? faker.string.uuid(),
      name: data?.name ?? "My Residence",
      phoneNumber:
        data?.phoneNumber ??
        // +{3 number}{space}{7-15 number that does not start with 0}
        `+${faker.string.numeric(3)} ${faker.string.numeric({
          length: 1,
          exclude: ["0"],
        })}${faker.string.numeric({
          length: { min: 6, max: 14 },
        })}`,
      longitude: data?.longitude ?? faker.location.longitude(),
      latitude: data?.latitude ?? faker.location.latitude(),
      village: data?.village ?? faker.location.street().slice(0, 50),
      district: data?.district ?? faker.location.county().slice(0, 50),
      city: data?.city ?? faker.location.city().slice(0, 50),
      province: data?.city ?? faker.location.state().slice(0, 50),
      country: data?.country ?? faker.location.country().slice(0, 50),
      recipient: data?.recipient ?? faker.person.fullName().slice(0, 60),
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
