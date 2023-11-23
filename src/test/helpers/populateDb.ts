import Tag from "../../models/Tag";
import sequelizeTest from "../sequelizeTest";
import { createItem } from "./item/itemHelper";

async function sequelizetry() {
  try {
    await sequelizeTest.sync({ force: true });
    //create 4 shops each with 200 item
    const items0 = await createItem(200);
    const items1 = await createItem(200);
    const items2 = await createItem(200);
    const items3 = await createItem(200);
    const itemsList = [items0, items1, items2, items3];
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
