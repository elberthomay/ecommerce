import Address, { AddressCreationAttribute } from "../models/Address";

export interface AddressParamType {
  addressId: Address["id"];
}

export type AddressCreateType = Omit<AddressCreationAttribute, "id">;

export type AddressUpdateType = Partial<AddressCreateType>;

export interface AddressOutputType {
  id: Address["id"];
  name: Address["name"];
  phoneNumber: Address["phoneNumber"];
  longitude: Address["longitude"];
  latitude: Address["latitude"];
  postCode: Address["postCode"];
  detail: Address["detail"];
  village: Address["village"];
  district: Address["district"];
  city: Address["city"];
  province: Address["province"];
  country: Address["country"];
  recipient: Address["recipient"];
  subdistrictId: Address["subdistrictId"];
  selected: boolean;
}
