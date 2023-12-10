import { faker } from "@faker-js/faker";
import Shop, { ShopCreationAttribute } from "../../../models/Shop";
import { createUser } from "../user/userHelper";
import { defaultUser } from "../user/userData";
import { ShopUpdateType } from "../../../types/shopTypes";

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
        description:
          creationData?.description ??
          generateShopDescription(creationData?.name ?? faker.company.name()),
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
      const [shop, created] = await Shop.findOrCreate({
        where: { id: shopData.id },
        defaults: shopData,
      });
      return shop;
    })
  );

  return records;
};

function generateShopDescription(name: string) {
  const catchPhrase = faker.company.catchPhrase();
  const industry = faker.company.catchPhraseNoun();
  const buzzwords = Array.from({ length: 6 }, () =>
    faker.company.buzzNoun()
  ).join(", ");
  return `${name} is a leading ${industry} company that specializes in ${buzzwords}. ${catchPhrase}`;
}

export const defaultShop: ShopCreationAttribute = {
  id: "3cff9666-acc7-416b-8ad8-70c8fac437f0",
  name: "default shop",
  description:
    "this is a new shop i created, it's called default shop.\n isn't it fantastic?",
  userId: defaultUser.id,
};

export const defaultShopUpdate: ShopUpdateType = {
  name: faker.company.name(),
  description: generateShopDescription(faker.company.name()),
};

export const createDefaultShop = () => createShop([defaultShop]);
