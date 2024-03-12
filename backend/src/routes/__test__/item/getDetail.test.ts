import request from "supertest";
import app from "../../../app";
import { createItem, defaultItem } from "../../../test/helpers/item/itemHelper";
import { defaultShop } from "../../../test/helpers/shop/shopHelper";
import Item from "../../../models/Item";
import _ from "lodash";
import ItemImage from "../../../models/ItemImage";
import { itemDetailsOutputSchema } from "@elycommerce/common";
import Tag from "../../../models/Tag";
import { validatedExpect } from "../../../test/helpers/assertionHelper";

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
      const validationResult = itemDetailsOutputSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.images).toHaveLength(6);
      }
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
    .expect(
      validatedExpect(itemDetailsOutputSchema, (data, res) => {
        expect(data.images).toHaveLength(6);
        //order must equal index(ascending with no gap)
        const orderIsAscending = data.images.every(
          ({ order }, index) => order === index
        );
        expect(orderIsAscending).toBe(true);
      })
    );
});
