import { TokenTypes } from "../types/TokenTypes";
import jwt from "jsonwebtoken";

export const forgeCookie = (
  sessionData: TokenTypes,
  jwtKey: string,
  cookieName: string
) => {
  const token = jwt.sign(sessionData, jwtKey);
  // const cookie = Buffer.from(token).toString("base64");
  return `${cookieName}=${token}`;
};
