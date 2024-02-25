import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
import {
  createUser,
  defaultCookie,
  forgeCookie,
} from "../../../test/helpers/user/userHelper";
import {
  defaultRootUser,
  defaultUser,
} from "../../../test/helpers/user/userData";
import { printedExpect } from "../../../test/helpers/assertionHelper";
import validationTest from "../../../test/helpers/validationTest.test";
import { z } from "zod";
import { tagPatchSchema } from "../../../schemas/tagSchema";
import {
  invalidTagIds,
  invalidTagValues,
} from "../../../test/helpers/Tag/tagData";

const url = "/api/tag/";
const defaultTagId = 1;
const defaultTagName = "food";

const getRequest = (tagId: number, cookie: string[]) =>
  request(app)
    .patch(url + tagId)
    .set("Cookie", cookie);

const getDefaultRequest = () => getRequest(defaultTagId, defaultCookie());

beforeEach(async () => {
  await createUser([defaultUser]);
  await Tag.create({ id: defaultTagId, name: defaultTagName });
});

it("return 400 for validation error", async () => {
  await validationTest<z.infer<typeof tagPatchSchema>>(
    getDefaultRequest,
    { name: "grocery" },
    invalidTagValues
  );
  await Promise.all(
    invalidTagIds.map((tagId) =>
      getRequest(tagId as any, defaultCookie())
        .send({ name: "grocery" })
        .expect(printedExpect(400))
    )
  );
});

it("return 404 when tag does not exist", async () => {
  await getRequest(defaultTagId + 1, [forgeCookie(defaultRootUser)])
    .send({ name: "grocery" })
    .expect(printedExpect(404));
});

it("should return 403 when accessed by non-admin/root", async () => {
  await getDefaultRequest()
    .send({ name: "grocery" })
    .expect(printedExpect(403));

  let updatedTag = await Tag.findByPk(defaultTagId);
  expect(updatedTag?.name).toEqual(defaultTagName);
});

it("should return 409 for duplicate name", async () => {
  const tag = await Tag.create({ name: "grocery" });
  await request(app)
    .patch(url + tag.id)
    .set("Cookie", forgeCookie(defaultRootUser))
    .send({ name: defaultTagName })
    .expect(printedExpect(409));
});

it("should successfully update tag when accessed by admin", async () => {
  const newTagName = "Grocery";
  const {
    users: [newAdmin],
  } = await createUser([{ privilege: 1 }]);

  await getRequest(defaultTagId, [forgeCookie(newAdmin)])
    .send({ name: newTagName })
    .expect(printedExpect(200));

  const updatedTag = await Tag.findByPk(defaultTagId);
  expect(updatedTag?.name).toEqual(newTagName);
});

it("should successfuly updated tag and return the updated tag data", async () => {
  const newName = "grocery";
  await getRequest(defaultTagId, [forgeCookie(defaultRootUser)])
    .send({ name: newName })
    .expect(printedExpect(200))
    .expect(({ body }) => {
      expect(body.id).toEqual(defaultTagId);
      expect(body.name).toEqual(newName);
    });
  const updatedTag = await Tag.findByPk(defaultTagId);
  expect(updatedTag?.name).toEqual(newName);
});
