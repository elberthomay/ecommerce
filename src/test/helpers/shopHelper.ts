import { faker } from "@faker-js/faker";
import Shop, { ShopCreationAttribute } from "../../models/Shop";
import { createUser, defaultUser } from "./user/userHelper";

/**
 * Create Shop from number or array of fragmented(or whole) user data.
 * incomplete user data will be completed with random data.
 * @param creationData
 */
export const createShop = async (
  creationData: number | Partial<ShopCreationAttribute>[]
) => {
  let shopDatas: ShopCreationAttribute[];
  // function to create fake shop data
  const createShopData =
    (creationData?: Partial<ShopCreationAttribute>) => () => {
      return {
        id: creationData?.id ?? faker.string.uuid(),
        name: creationData?.name ?? faker.company.name(),
        userId: creationData?.userId ?? faker.string.uuid(),
      };
    };

  // create shop creation data
  if (typeof creationData === "number")
    shopDatas = faker.helpers.multiple(createShopData(), {
      count: creationData,
    });
  else shopDatas = creationData.map((data) => createShopData(data)());
  // create users and shop
  const records = await Promise.all(
    shopDatas.map(async (shopData) => {
      await createUser([{ id: shopData.userId }]);
      const pair = await Shop.findOrCreate({
        where: { id: shopData.id },
        defaults: shopData,
      });
      return pair[0];
    })
  );

  return records;
};

export const defaultShop: ShopCreationAttribute = {
  id: "3cff9666-acc7-416b-8ad8-70c8fac437f0",
  name: "default shop",
  userId: defaultUser.id,
};

export const createDefaultShop = () => createShop([defaultShop]);
