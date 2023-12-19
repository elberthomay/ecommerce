import Tag from "../../models/Tag";
import sequelize from "../../models/sequelize";
import { createItem } from "./item/itemHelper";
import { createShop } from "./shop/shopHelper";

async function sequelizetry() {
  try {
    await sequelize.sync({ force: true });
    //create 4 shops each with 200 item
    const shops = await createShop(4);
    const itemsList = await Promise.all(
      shops.map(async (shop) => {
        const items = await Promise.all(
          Array(200)
            .fill(null)
            .map(async (_) => (await createItem(1, { id: shop.id }))[0])
        );
        return items;
      })
    );
    //create tags
    const tags = await Tag.bulkCreate(
      ["food", "clothing", "jars", "vehicle"].map((name) => ({ name }))
    );
    //add items to tags
    await Promise.all(
      itemsList.reduce(
        (promiseArray, items) =>
          promiseArray.concat(
            tags.map((tag, index) =>
              tag.$add("items", items.slice(index * 50, index * 50 + 50))
            )
          ),
        [] as Promise<unknown>[]
      )
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
}

sequelizetry();
