import { Router } from "express";
import catchAsync from "../middlewares/catchAsync";
import Tag, { TagCreationAttribute } from "../models/Tag";
import validator from "../middlewares/validator";
import {
  tagCreateSchema,
  tagQuerySchema,
  tagPatchSchema,
} from "../schemas.ts/tagSchema";
import fetch from "../middlewares/fetch";

const router = Router();

/** return list of all tags */
router.get(
  "/",
  catchAsync(async (req, res) => {
    const tags = await Tag.findAll({ attributes: ["id", "name"] });
    res.json(tags);
  })
);

/** add new tag */
router.post(
  "/",
  validator({ body: tagCreateSchema }),
  fetch<TagCreationAttribute, { name: string }>({
    model: Tag,
    key: "name",
    location: "body",
    force: "absent",
  }),
  catchAsync(async (req, res) => {
    const data: { name: string } = req.body;
    const newTag = await Tag.create(data);
    res.status(201).json(newTag);
  })
);

/** edit tag */
router.patch(
  "/:tagId",
  validator({ params: tagQuerySchema, body: tagPatchSchema }),
  fetch<TagCreationAttribute, { tagId: number }>({
    model: Tag,
    key: ["id", "tagId"],
    location: "params",
    force: "exist",
  }),
  catchAsync(async (req, res) => {
    const tag: Tag = (req as any)[Tag.name];
    const tagPatchData: { name: string } = (req as any).body;
    await tag.set(tagPatchData).save();
    res.json(tag);
  })
);

/** delete tag */
router.delete(
  "/:tagId",
  validator({ params: tagQuerySchema }),
  fetch<TagCreationAttribute, { tagId: number }>({
    model: Tag,
    key: ["id", "tagId"],
    location: "params",
    force: "exist",
  }),
  catchAsync(async (req, res) => {
    const tag: Tag = (req as any)[Tag.name];
    await tag.destroy();
    res.json(tag);
  })
);

export default router;
