import request from "supertest";
import app from "../../../app";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shopHelper";
import Item from "../../../models/Item";
import _ from "lodash";
import ItemImage from "../../../models/ItemImage";
import { itemDetailsOutputSchema } from "../../../schemas.ts/itemSchema";
import Tag from "../../../models/Tag";

const url = "/api/item/";

it("should return 404 when there are item does not exist", async () => {
  await request(app)
    .get(url + defaultItem.id)
    .expect(404);
});

it("should return 404 when there are 10 items but using default item ID", async () => {
  await createItem(10);
  await request(app)
    .get(url + defaultItem.id)
    .expect(404);
});

it("should return 200 when there is 1 item from 1 user using the created item ID", async () => {
  const [item] = await createItem([defaultItem], defaultShop);
  await request(app)
    .get(url + defaultItem.id)
    .expect(200)
    .expect(({ body }) => {
      expect(
        _.pick(body, [
          "id",
          "description",
          "name",
          "price",
          "quantity",
          "shopId",
        ])
      ).toEqual(defaultItem);
    });
});

it("should return 200 when there are 10 items created and using one of the created item IDs", async () => {
  await createItem(
    new Array(5).fill({}).concat([defaultItem], new Array(4).fill({})),
    defaultShop
  );
  expect(await Item.count()).toEqual(10);
  const item = await Item.findByPk(defaultItem.id);
  await request(app)
    .get(url + defaultItem.id)
    .expect(200)
    .expect(({ body }) => {
      expect(
        _.pick(body, [
          "id",
          "description",
          "name",
          "price",
          "quantity",
          "shopId",
        ])
      ).toEqual(defaultItem);
    });
});

it("should return 200 with the correct schema", async () => {
  const items = await createItem(
    new Array(5).fill({}).concat([defaultItem], new Array(4).fill({})),
    defaultShop
  );

  await Promise.all(
    items.map(({ id: itemId }) =>
      ItemImage.bulkCreate([
        { itemId, imageName: "image1", order: 0 },
        { itemId, imageName: "image2", order: 1 },
        { itemId, imageName: "image3", order: 2 },
      ])
    )
  );

  await ItemImage.bulkCreate([
    { itemId: defaultItem.id!, imageName: "image4", order: 3 },
    { itemId: defaultItem.id!, imageName: "image5", order: 4 },
    { itemId: defaultItem.id!, imageName: "image6", order: 5 },
  ]);

  const tags = await Tag.bulkCreate([{ name: "leaf" }, { name: "stone" }]);
  console.log(tags[0].id);

  const fetchedDefaultItem = await Item.findByPk(defaultItem.id);

  await request(app)
    .get(url + defaultItem.id)
    .expect(200)
    .expect(({ body }) => {
      console.log(body);
      expect(itemDetailsOutputSchema.validateAsync(body)).resolves;
      expect(body?.images).toHaveLength(6);
    });
});
