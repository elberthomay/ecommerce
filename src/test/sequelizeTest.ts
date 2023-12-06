import { Sequelize } from "sequelize-typescript";
import User from "../models//User";
import Shop from "../models/Shop";
import Item from "../models/Item";
import Tag from "../models/Tag";
import ItemTag from "../models/ItemTag";
import Cart from "../models/Cart";
import Address from "../models/address";
import City from "../models/City";
import Subdistrict from "../models/Subdistrict";
import UserAddress from "../models/UserAddress";
import ShopAddress from "../models/ShopAddress";

const sequelizeTest = new Sequelize({
  database: "ecommercetest",
  dialect: "mysql",
  username: "root",
  password: "123456",
  host: "localhost",
  models: [
    User,
    Shop,
    Item,
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

export default sequelizeTest;
