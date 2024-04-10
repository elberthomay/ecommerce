import { Sequelize, Model } from "sequelize-typescript";
import User from "./User";
import Shop from "./Shop";
import Item from "./Item";
import Tag, { TagCreationAttribute } from "./Tag";
import ItemTag from "./ItemTag";
import Cart from "./Cart";
import Address from "./Address";
import City from "./City";
import Subdistrict from "./Subdistrict";
import UserAddress from "./UserAddress";
import ShopAddress from "./ShopAddress";
import ItemImage from "./ItemImage";
import Order from "./Order";
import OrderItem from "./OrderItem";
import OrderItemImage from "./OrderItemImage";
import { addFKIfNotExistToModel } from "./helpers/modelHelpers";
import TempOrderItemImage from "./temp/TempOrderItemImage";
import TempOrderItem from "./temp/TempOrderItem";
import OrderOrderItem from "./temp/OrderOrderItem";

const sequelize = new Sequelize({
  database: process.env.DB_NAME ?? "ecommerce_test",
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
    Order,
    OrderItem,
    OrderItemImage,

    TempOrderItem,
    OrderOrderItem,
    TempOrderItemImage,
  ],
  logging: false,
});

OrderItemImage.afterSync(
  addFKIfNotExistToModel(OrderItemImage, OrderItem, [
    ["orderId", "orderId"],
    ["itemId", "id"],
  ])
);

TempOrderItemImage.afterSync(
  addFKIfNotExistToModel(TempOrderItemImage, TempOrderItem, [
    ["itemId", "id"],
    ["version", "version"],
  ])
);

OrderOrderItem.afterSync(
  addFKIfNotExistToModel(OrderOrderItem, TempOrderItem, [
    ["itemId", "id"],
    ["version", "version"],
  ])
);

export default sequelize;
