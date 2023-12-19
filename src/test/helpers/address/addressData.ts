import { omit } from "lodash";
import { AddressCreationAttribute } from "../../../models/Address";
import { AddressCreateType } from "../../../types/addressType";

export const invalidAddressValues = {
  latitude: [
    "invalid_latitude", // Not a number
    100, // Outside the valid range
    -91, // Outside the valid range
    "90.5", // Not an integer
  ],
  longitude: [
    "invalid_longitude", // Not a number
    200, // Outside the valid range
    -181, // Outside the valid range
    "180.5", // Not an integer
  ],
  postCode: [
    "ABCDE", // Not a numeric string
    "123456", // Longer than 5 characters
    "12.34", // Contains a dot
    "1243", // less than 5 character
  ],
  detail: [
    123, // Not a string
    "a".repeat(201), // Longer than 200 characters
  ],
  subdistrictId: [
    "invalid_subdistrictId", // Not a number
    12.34, // Not an integer
    -1, // Negative integer
  ],
};

export const defaultAddress: AddressCreationAttribute = {
  id: "2daf81a5-0c2e-4ecc-be04-258a87a36081",
  latitude: 0.0,
  longitude: 0.0,
  postCode: "93838",
  detail: "super plint street blgr avenue, near falias mall.",
};

export const defaultAddressCreateObject: AddressCreateType = omit(
  defaultAddress,
  ["id"]
);
