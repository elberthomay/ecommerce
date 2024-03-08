import "dotenv/config";
import sequelize from "./models/sequelize";
import { generateOrders } from "./test/helpers/order/orderHelper";
import { faker } from "@faker-js/faker";
import Order from "./models/Order";
import { includes } from "lodash";
import Shop from "./models/Shop";
import OrderItem from "./models/OrderItem";
import { getOrderItemImageInclude } from "./models/OrderItemImage";
import { formatGetOrders } from "./schemas/orderSchema";

(async () => {
  await sequelize.sync();
  const userId = faker.string.uuid();
  await generateOrders(5, { id: userId });
  await generateOrders(5);
  await generateOrders(5);

  const orders = await Order.findAll({
    where: { userId },
    include: [
      Shop,
      {
        model: OrderItem,
        include: [getOrderItemImageInclude("items")],
      },
    ],
  });
  const parsed = formatGetOrders.parse(orders);
  console.log(JSON.stringify(parsed, null, 2));
})();
