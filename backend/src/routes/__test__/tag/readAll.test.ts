import request from "supertest";
import app from "../../../app";
import Tag from "../../../models/Tag";
const url = "/api/tag";

it("should return a list of tag", async () => {
  //create tags
  const tagNames = [
    "food",
    "vehicle",
    "utensil",
    "computer parts",
    "clothes",
    "male clothes",
    "female clothes",
    "book",
    "furniture",
    "electronics",
  ];
  const tags = await Tag.bulkCreate(tagNames.map((name) => ({ name })));
  await request(app)
    .get(url)
    .send()
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(10);
    });
});
