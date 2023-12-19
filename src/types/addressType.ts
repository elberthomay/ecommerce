import Address, { AddressCreationAttribute } from "../models/Address";

export interface AddressParamType {
  addressId: Address["id"];
}

export type AddressCreateType = Omit<AddressCreationAttribute, "id">;

export type AddressUpdateType = Partial<AddressCreateType>;

export interface AddressOutputType {
  id: Address["id"];
  longitude: Address["longitude"];
  latitude: Address["latitude"];
  postCode: Address["postCode"];
  detail: Address["detail"];
  subdistrictId: Address["subdistrictId"];
  selected: boolean;
}
