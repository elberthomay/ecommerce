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
