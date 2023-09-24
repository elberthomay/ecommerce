import Joi from "joi";

export const uuidSchema = Joi.string().uuid({
  version: "uuidv4",
  separator: "-",
});

export const paginationSchema = {
  limit: Joi.number().min(1).max(200),
  page: Joi.number().min(1).max(5000),
};
