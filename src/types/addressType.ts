import Address from "../models/address";

export interface AddressParamType {
  addressId: Address["id"];
}

export interface AddressCreateType {
  longitude: Address["longitude"];
  latitude: Address["latitude"];
  postCode?: Address["postCode"];
  detail?: Address["detail"];
  subdistrictId?: Address["subdistrictId"];
}

export type AddressUpdateType = Partial<AddressCreateType>;
