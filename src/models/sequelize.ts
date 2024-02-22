import { Sequelize } from "sequelize-typescript";
import User from "./User";
import Shop from "./Shop";
import Item from "./Item";
import Tag from "./Tag";
import ItemTag from "./ItemTag";
import Cart from "./Cart";
import Address from "./Address";
import City from "./City";
import Subdistrict from "./Subdistrict";
import UserAddress from "./UserAddress";
import ShopAddress from "./ShopAddress";
import ItemImage from "./ItemImage";

const sequelize = new Sequelize({
  database:
    process.env.NODE_ENV === "test"
      ? "ecommerce_test"
      : process.env.DB_NAME ?? "ecommerce",
  dialect: "mysql",
  dialectOptions: {
    decimalNumbers: true,
  },
  username: process.env.DB_USERNAME ?? "root",
  password: process.env.DB_PASSWORD ?? "123456",
  host: process.env.DB_HOST ?? "ecommerce-db-srv",
  models: [
    User,
    Shop,
    Item,
    ItemImage,
    Tag,
    ItemTag,
    Cart,
    City,
    Subdistrict,
    Address,
    UserAddress,
    ShopAddress,
  ],
  logging: false,
});

export default sequelize;
