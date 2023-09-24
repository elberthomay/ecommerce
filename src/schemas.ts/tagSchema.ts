import Joi from "joi";
import { TagCreateType, TagPatchType, TagQueryType } from "../types/tagTypes";

export const tagSchema = {
  id: Joi.number().integer().min(1).max(1000),
  name: Joi.string().max(50),
};

export const tagQuerySchema = Joi.object<TagQueryType>({
  tagId: tagSchema.id.required(),
});

export const tagCreateSchema = Joi.object<TagCreateType>({
  name: tagSchema.name.required(),
})
  .required()
  .unknown(false);

export const tagPatchSchema = Joi.object<TagPatchType>({
  name: tagSchema.name.optional(),
})
  .required()
  .unknown(false)
  .min(1);
