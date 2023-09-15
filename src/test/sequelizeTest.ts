import { Sequelize } from "sequelize-typescript";
import Shop from "../models/Shop";
import User from "../models/User";
import Item from "../models/Item";
import Tag from "../models/Tag";
import ItemTag from "../models/ItemTag";
import Cart from "../models/Cart";

const sequelizeTest = new Sequelize({
  database: "test",
  dialect: "sqlite",
  storage: ":memory:",
  models: [User, Shop, Item, Tag, ItemTag, Cart],
  logging: false,
});

export default sequelizeTest;
