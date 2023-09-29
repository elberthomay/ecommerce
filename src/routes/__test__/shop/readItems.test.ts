import app from "../../../app";
import pagingAndLimitTests from "../../../test/pagingAndLimitTests.test";
import { defaultShop } from "../../../test/helpers/shopHelper";
import { createItem } from "../../../test/helpers/item/itemHelper";

const url = "/api/shop/" + defaultShop.id + "/item";

describe("Test limit and paging", () => {
  pagingAndLimitTests(app, url, (count: number) =>
    createItem(count, defaultShop)
  );
});

describe("Test limit and paging with items from other shop", () => {
  beforeEach(async () => {
    await createItem(100);
  });
  pagingAndLimitTests(app, url, (count: number) =>
    createItem(count, defaultShop)
  );
});
