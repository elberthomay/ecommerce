import Joi from "joi";

const emailSchema = Joi.string().email().required().label("Email").messages({
  "string.email": "{#label} must be a valid email address",
  "any.required": "{#label} is required",
});

const passwordSchema = Joi.string()
  .min(8)
  .max(90)
  .required()
  .label("Password")
  .messages({
    "string.min": "{#label} must be at least {#limit} characters long",
    "string.max": "{#label} must be shorter than {#limit} characters",
    "any.required": "{#label} is required",
  });

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const registerSchema = Joi.object<RegisterData>({
  name: Joi.string()
    .required()
    .label("Name")
    .messages({ "any.required": "{#label} is required" }),
  email: emailSchema,
  password: passwordSchema,
})
  .unknown(false)
  .required();

export interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const loginSchema = Joi.object<LoginData>({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: Joi.boolean().default(false),
})
  .required()
  .unknown(false);
