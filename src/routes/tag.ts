import { NextFunction, Request, Response, Router } from "express";
import catchAsync from "../middlewares/catchAsync";
import Tag, { TagCreationAttribute } from "../models/Tag";
import validator from "../middlewares/validator";
import {
  tagCreateSchema,
  tagQuerySchema,
  tagPatchSchema,
} from "../schemas.ts/tagSchema";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import authenticate from "../middlewares/authenticate";
import User from "../models/User";
import { AuthorizationError } from "../errors/AuthorizationError";
import { TagCreateType, TagPatchType } from "../types/tagTypes";
import { authorization } from "../middlewares/authorize";

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
  fetch<TagCreationAttribute, { name: string }>({
    model: Tag,
    key: "name",
    location: "body",
    force: "absent",
  }),
  fetchCurrentUser,
  authorizeStaff,
  catchAsync(async (req: Request<unknown, unknown, TagCreateType>, res) => {
    const data = req.body;
    const newTag = await Tag.create(data);
    res.status(201).json(newTag);
  })
);

/** edit tag */
router.patch(
  "/:tagId",
  authenticate(true),
  validator({ params: tagQuerySchema, body: tagPatchSchema }),
  fetchCurrentUser,
  authorizeStaff,
  fetch<TagCreationAttribute, TagPatchType>({
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
  catchAsync(async (req: Request<unknown, unknown, TagPatchType>, res) => {
    const tag: Tag = (req as any)[Tag.name];
    const tagPatchData = req.body;
    await tag.set(tagPatchData).save();
    res.json(tag);
  })
);

/** delete tag */
router.delete(
  "/:tagId",
  authenticate(true),
  validator({ params: tagQuerySchema }),
  fetchCurrentUser,
  authorizeStaff,
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
