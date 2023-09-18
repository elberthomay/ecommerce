import { TokenTypes } from "../types/TokenTypes";
import jwt from "jsonwebtoken";

export const forgeCookie = (
  sessionData: TokenTypes,
  jwtKey: string,
  cookieName: string,
  options?: jwt.SignOptions
) => {
  const token = jwt.sign(sessionData, jwtKey, options);
  // const cookie = Buffer.from(token).toString("base64");
  return `${cookieName}=${token}`;
};

export const defaultUser = {
  id: "3ad3bf2c-6a47-4ce3-ba64-afed197160e0",
  email: "test@example.com",
  name: "Test Name",
  hash: "$2b$10$xAUHKDvjpyGgSOO8HARfZOdQZj7xwd/4hIiTjjBPsYOtvUhsZ6EtO", //password123
};

export const defaultCookie = (options?: jwt.SignOptions) => [
  forgeCookie(
    {
      id: defaultUser.id,
    },
    process.env.JWT_SECRET!,
    "jwt",
    options
  ),
];

export const anotherUser = {
  id: "3ad3bf2c-6a47-4ce3-ba98-afed197160e0",
  email: "another@gmail.com",
  name: "Another person",
  hash: "$2b$10$xAUHKDvjpyGgSOO8HARfZOdQZj7xwd/4hIiTjjBPsYOtvUhsZ6EtO", //password123
};

export const anotherCookie = (options?: jwt.SignOptions) => [
  forgeCookie(
    {
      id: anotherUser.id,
    },
    process.env.JWT_SECRET!,
    "jwt",
    options
  ),
];
