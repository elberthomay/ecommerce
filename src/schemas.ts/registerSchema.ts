import Joi from "joi";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const registerSchema = Joi.object<RegisterData>({
  name: Joi.string().required().label("Name"),
  email: Joi.string().email().required().label("Email").messages({
    "string.email": "{#label} must be a valid email address",
  }),
  password: Joi.string().min(8).max(90).required().label("Password").messages({
    "string.min": "{#label} must be at least {#limit} characters long",
    "string.max": "{#label} must be shorter than {#limit} characters",
    "any.required": "{#label} is required",
  }),
})
  .unknown(false)
  .required();
