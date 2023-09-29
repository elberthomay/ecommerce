export const invalidEmails = [
  "invalid@mistake", // invalid TLD
  "invalidmistake.com", // no @
  "@mistake.com", // no identifier
  "inval/id@mis?take.com", // invalid character
];

export const invalidPasswords = [
  "1234567", // Password less than 8 characters
  "a".repeat(91), // Password more than 90 characters
];

export const invalidName = [
  "a".repeat(256), //more than 256 character
];
