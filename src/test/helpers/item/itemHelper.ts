import Item, { ItemCreationAttribute } from "../../../models/Item";
import { ShopCreationAttribute } from "../../../models/Shop";
import { faker } from "@faker-js/faker";
import { createShop, defaultShop } from "../shop/shopHelper";

/**
 * create items using count or array of fragmented item data.
 * all item would be created for one shop,
 * optional shop data could be provided.
 * @param creationData number | array of ItemCreationAttribute fragment
 * @param optionalShop Partial of ShopCreationAtrribute
 */
export const createItem = async (
  creationData: number | Omit<Partial<ItemCreationAttribute>, "shopId">[],
  optionalShop?: Partial<ShopCreationAttribute>
) => {
  const [shop] = await createShop(optionalShop ? [optionalShop] : 1);
  let itemDatas: ItemCreationAttribute[];
  const createItemData =
    (data?: Partial<ItemCreationAttribute>) => (): ItemCreationAttribute => {
      return {
        id: data?.id ?? faker.string.uuid(),
        name: data?.name ?? faker.commerce.productName(),
        description: data?.description ?? faker.commerce.productDescription(),
        price: data?.price ?? faker.number.int({ min: 0, max: 1000000000 }),
        quantity: data?.quantity ?? faker.number.int({ min: 0, max: 9999 }),
        shopId: shop.id,
      };
    };

  if (typeof creationData === "number")
    itemDatas = faker.helpers.multiple(createItemData(), {
      count: creationData,
    });
  else itemDatas = creationData.map((data) => createItemData(data)());

  const records = await Item.bulkCreate(itemDatas);
  return records;
};

export const defaultItem: ItemCreationAttribute = {
  id: "519a6070-af42-48db-a3fc-ec434b0e35f3",
  name: "Blue Pencil",
  description: "It's a blue pencil with a good grip and vibrant colour",
  price: 100000,
  quantity: 10,
  shopId: defaultShop.id,
};
