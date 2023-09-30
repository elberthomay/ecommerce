import { Sequelize } from "sequelize-typescript";
import User from "./User";
import Shop from "./Shop";
import Item from "./Item";
import Tag from "./Tag";
import ItemTag from "./ItemTag";
import Cart from "./Cart";

const sequelize = new Sequelize({
  database: "ecommerce",
  dialect: "mysql",
  username: "root",
  password: "123456",
  host: "localhost",
  models: [User, Shop, Item, Tag, ItemTag, Cart],
  logging: false,
});

export default sequelize;
