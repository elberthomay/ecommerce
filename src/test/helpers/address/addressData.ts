import { omit } from "lodash";
import { AddressCreationAttribute } from "../../../models/Address";
import { AddressCreateType } from "../../../types/addressType";

export const invalidAddressValues = {
  name: [
    "a".repeat(41), //more than 40 character
  ],
  phoneNumber: [
    "039383848392", //doesn't start with country code
    "+62 893020282i3", //contain non number
    "+1- 334939282838", //dash in country code not followed by number
    "+3392 393920203939", //country code more than 3 number
    "+62393920203939", //no space between country code and number
    "+1-2222 334939292020", //additional code more than 3 character
    "+62 8373728374838482", //id number more than 15 character
    "+62 373743", //id number less than 7 character
  ],
  latitude: [
    "invalid_latitude", // Not a number
    100, // Outside the valid range
    -91, // Outside the valid range
    "90.5", // Not an number
  ],
  longitude: [
    "invalid_longitude", // Not a number
    200, // Outside the valid range
    -181, // Outside the valid range
    "180.5", // Not an number
  ],
  village: [
    "a".repeat(51), //more than 50 character
  ],
  district: [
    "a".repeat(51), //more than 50 character
  ],
  city: [
    "a".repeat(51), //more than 50 character
  ],
  province: [
    "a".repeat(51), //more than 50 character
  ],
  country: [
    "a".repeat(51), //more than 50 character
  ],
  recipient: [
    "a".repeat(61), //more than 60 character
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
  name: "My workplace",
  phoneNumber: "+62 83928285610",
  village: "Bligard",
  district: "Glugard",
  city: "Valhalla",
  province: "Midgard",
  country: "Jotunheim",
  recipient: "Athena and Bacchus",
  latitude: -6.2382,
  longitude: 106.7726,
  postCode: "93838",
  detail: "super plint street blgr avenue, near falias mall.",
};

export const defaultAddressCreateObject: AddressCreateType = omit(
  defaultAddress,
  ["id"]
);
