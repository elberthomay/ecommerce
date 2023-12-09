import Joi from "joi";
import { UserLoginType, UserRegisterType } from "../types/userTypes";
import { uuidSchema } from "./commonSchema";

export const userSchema = {
  id: uuidSchema,
  name: Joi.string()
    .max(255)
    .label("Name")
    .messages({ "any.required": "{#label} is required" }),
  email: Joi.string().email().label("Email").messages({
    "string.email": "{#label} must be a valid email address",
    "any.required": "{#label} is required",
  }),
  privilege: Joi.valid(...[0, 1, 2]),
  selectedAddressId: Joi.string().uuid().allow(null),
  avatar: Joi.string().allow(null),
  password: Joi.string().min(8).max(90).label("Password").messages({
    "string.min": "{#label} must be at least {#limit} characters long",
    "string.max": "{#label} must be shorter than {#limit} characters",
    "any.required": "{#label} is required",
  }),
  rememberMe: Joi.boolean(),
};

export const registerSchema = Joi.object<UserRegisterType>({
  name: userSchema.name.required(),
  email: userSchema.email.required(),
  password: userSchema.password.required(),
})
  .unknown(false)
  .required();

export const loginSchema = Joi.object<UserLoginType>({
  email: userSchema.email.required(),
  password: userSchema.password.required(),
  rememberMe: userSchema.rememberMe.default(false),
})
  .required()
  .unknown(false);

export const currentUserOutputSchema = Joi.object({
  id: userSchema.id.required(),
  name: userSchema.name.required(),
  email: userSchema.email.required(),
  privilege: userSchema.privilege.required(),
  selectedAddressId: userSchema.selectedAddressId.required(),
  avatar: userSchema.avatar.required(),
  cartCount: Joi.number().integer().positive().required(),
})
  .unknown(false)
  .required();
