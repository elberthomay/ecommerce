import request from "supertest";
import app from "../../../app";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shop/shopHelper";
import Item from "../../../models/Item";
import _ from "lodash";
import ItemImage from "../../../models/ItemImage";
import { itemDetailsOutputSchema } from "../../../schemas.ts/itemSchema";
import Tag from "../../../models/Tag";
import { ItemDetailsOutputType } from "../../../types/itemTypes";

const getUrl = (itemId: string) => `/api/item/${itemId}`;
const defaultUrl = getUrl(defaultItem.id!);

const defaultRequest = () => request(app).get(defaultUrl);

it("should return 404 when there are item does not exist", async () => {
  await defaultRequest().expect(404);
});

it("should return 404 when there are 10 items but using default item ID", async () => {
  await createItem(10);
  await defaultRequest().expect(404);
});

it("should return 200 when there is 1 item from 1 user using the created item ID", async () => {
  const [item] = await createItem([defaultItem], defaultShop);
  await defaultRequest()
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

it("should return 200 when there are 10 items, one of which is defaultItem", async () => {
  await createItem(
    new Array(5).fill({}).concat([defaultItem], new Array(4).fill({})),
    defaultShop
  );
  expect(await Item.count()).toEqual(10);

  await defaultRequest()
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

  const fetchedDefaultItem = await Item.findByPk(defaultItem.id);

  await defaultRequest()
    .expect(200)
    .expect(({ body }) => {
      const { value, error } = itemDetailsOutputSchema.validate(body);
      expect(error).toBe(undefined);
      expect(body?.images).toHaveLength(6);
    });
});

it("expects images to be sorted ascending by order", async () => {
  await createItem([defaultItem]);
  await ItemImage.bulkCreate([
    { itemId: defaultItem.id!, imageName: "image4", order: 3 },
    { itemId: defaultItem.id!, imageName: "image5", order: 4 },
    { itemId: defaultItem.id!, imageName: "image6", order: 5 },
    { itemId: defaultItem.id!, imageName: "image1", order: 0 },
    { itemId: defaultItem.id!, imageName: "image2", order: 1 },
    { itemId: defaultItem.id!, imageName: "image3", order: 2 },
  ]);

  await defaultRequest()
    .expect(200)
    .expect(({ body }: { body: ItemDetailsOutputType }) => {
      const { value, error } = itemDetailsOutputSchema.validate(body);
      expect(error).toBe(undefined);
      expect(body.images).toHaveLength(6);

      const orderIsAscending = (
        body.images as ItemDetailsOutputType["images"]
      ).every(({ order }, index, array) => {
        //every price must be higher than the last, first one compare with -1
        return order > (index === 0 ? -1 : array[index - 1].order);
      });
      expect(orderIsAscending).toBe(true);
    });
});
