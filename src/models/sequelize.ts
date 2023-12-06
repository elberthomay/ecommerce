import { Sequelize } from "sequelize-typescript";
import User from "./User";
import Shop from "./Shop";
import Item from "./Item";
import Tag from "./Tag";
import ItemTag from "./ItemTag";
import Cart from "./Cart";
import Address from "./address";
import City from "./City";
import Subdistrict from "./Subdistrict";
import UserAddress from "./UserAddress";
import ShopAddress from "./ShopAddress";
import ItemImage from "./ItemImage";

const sequelize = new Sequelize({
  database: process.env.NODE_ENV === "test" ? "ecommerce_test" : "ecommerce",
  dialect: "mysql",
  dialectOptions: {
    decimalNumbers: true,
  },
  username: "root",
  password: "123456",
  host: "localhost",
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
