import Joi from "joi";

const idSchema = Joi.string().uuid();

const tagSchema = {
  id: Joi.number().integer().min(0).max(1000),
  name: Joi.string().max(50),
};

export const tagIdQuerySchema = Joi.object({
  tagId: tagSchema.id.required(),
});

export const tagCreateSchema = Joi.object({
  name: tagSchema.name.required(),
})
  .required()
  .unknown(false);

export const tagPatchSchema = Joi.object({
  name: tagSchema.name,
})
  .required()
  .unknown(false)
  .min(1);
