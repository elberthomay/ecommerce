import { pick } from "lodash";

export const invalidUserValue = {
  email: [
    undefined,
    "", //empty
    "invalid@mistake", // no TLD
    "invalidmistake.com", // no @
    "@mistake.com", // no identifier
    "inval/id@mis?take.com", // invalid character
    `${"a".repeat(65)}@gmail.com`, // local address longer than 64 character
    `blueshark@${"a".repeat(252)}.com`, // complete domain longer than 255 character
    `blueshark@gmail.co${"m".repeat(62)}`, // domain name longer than 63 character
  ],
  name: [
    undefined,
    "",
    "a".repeat(256), //more than 256 character
  ],
  password: [
    undefined,
    "",
    "1234567", // Password less than 8 characters
    "a".repeat(91), // Password more than 90 characters
  ],
};

export const defaultUser = {
  id: "3ad3bf2c-6a47-4ce3-ba64-afed197160e0",
  email: "test@example.com",
  name: "Test Name",
  password: "password123",
};

export const defaultRootUser = {
  id: "538a708b-517c-48de-851f-607357b105bb",
  email: "root@user.com",
  name: "Root User",
  password: "root123456789",
  privilege: 0 as 0,
};

export const defaultRegisterData = pick(defaultUser, [
  "email",
  "name",
  "password",
]);
