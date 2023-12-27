import User from "../models/User";

export interface UserRegisterType {
  name: User["name"];
  email: User["email"];
  password: string;
}

export interface UserLoginType {
  email: User["email"];
  password: string;
  rememberMe: boolean;
}

export interface UserUpdateType {
  name: User["name"];
}

export type CurrentUserOutputType =
  | Record<string, never>
  | {
      id: User["id"];
      name: User["name"];
      email: User["email"];
      privilege: User["privilege"];
      selectedAddressId: User["selectedAddressId"];
      avatar: User["avatar"];
      cartCount: number;
    };
