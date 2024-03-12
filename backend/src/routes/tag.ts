import { NextFunction, Request, Response, Router } from "express";
import catchAsync from "../middlewares/catchAsync";
import Tag, { TagCreationAttribute } from "../models/Tag";
import validator from "../middlewares/validator";
import {
  tagCreateSchema,
  tagPatchSchema,
  tagParamSchema,
} from "@elycommerce/common";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import authenticate from "../middlewares/authenticate";
import { authorization } from "../middlewares/authorize";
import { z } from "zod";

const router = Router();

const authorizeStaff = authorization([0, 1], "Tag");

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
  authenticate(true),
  validator({ body: tagCreateSchema }),
  fetch<TagCreationAttribute, z.infer<typeof tagCreateSchema>>({
    model: Tag,
    key: "name",
    location: "body",
    force: "absent",
  }),
  fetchCurrentUser,
  authorizeStaff,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof tagCreateSchema>>,
      res
    ) => {
      const data = req.body;
      const newTag = await Tag.create(data);
      res.status(201).json(newTag);
    }
  )
);

/** edit tag */
router.patch(
  "/:tagId",
  authenticate(true),
  validator({ params: tagParamSchema, body: tagPatchSchema }),
  fetchCurrentUser,
  authorizeStaff,
  fetch<TagCreationAttribute, z.infer<typeof tagPatchSchema>>({
    model: Tag,
    key: "name",
    location: "body",
    force: "absent",
  }),
  fetch<TagCreationAttribute, { tagId: number }>({
    model: Tag,
    key: ["id", "tagId"],
    location: "params",
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof tagPatchSchema>>,
      res
    ) => {
      const tag: Tag = (req as any)[Tag.name];
      const tagPatchData = req.body;
      await tag.set(tagPatchData).save();
      res.json(tag);
    }
  )
);

/** delete tag */
router.delete(
  "/:tagId",
  authenticate(true),
  validator({ params: tagParamSchema }),
  fetchCurrentUser,
  authorizeStaff,
  fetch<TagCreationAttribute, z.infer<typeof tagParamSchema>>({
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
