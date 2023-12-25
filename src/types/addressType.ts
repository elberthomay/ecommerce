import Address, { AddressCreationAttribute } from "../models/Address";

export interface AddressParamType {
  addressId: Address["id"];
}

export type AddressCreateType = Omit<AddressCreationAttribute, "id">;

export type AddressUpdateType = Partial<AddressCreateType>;

export interface AddressOutputType {
  id: AddressCreationAttribute["id"];
  name: AddressCreationAttribute["name"];
  phoneNumber: AddressCreationAttribute["phoneNumber"];
  longitude: AddressCreationAttribute["longitude"];
  latitude: AddressCreationAttribute["latitude"];
  postCode: AddressCreationAttribute["postCode"];
  detail: AddressCreationAttribute["detail"];
  village: AddressCreationAttribute["village"];
  district: AddressCreationAttribute["district"];
  city: AddressCreationAttribute["city"];
  province: AddressCreationAttribute["province"];
  country: AddressCreationAttribute["country"];
  recipient: AddressCreationAttribute["recipient"];
  subdistrictId: AddressCreationAttribute["subdistrictId"];
  selected: boolean;
}
