import { Agenda } from "@hokify/agenda";
import Order from "../models/Order";
import { OrderStatuses } from "@elycommerce/common";
import sequelize from "../models/sequelize";

const username = process.env.MONGO_INITDB_ROOT_USERNAME ?? "root";
const password = process.env.MONGO_INITDB_ROOT_PASSWORD ?? "1234";

const mongoConnectionString = `mongodb://${username}:${password}@agenda-mongo-db-srv:27017/agenda`;
console.log(mongoConnectionString);

export interface orderTimeoutParamType {
  orderId: string;
  initialStatus: OrderStatuses;
  targetStatus: OrderStatuses;
}

const agenda = new Agenda({ db: { address: mongoConnectionString } });

agenda.define<orderTimeoutParamType>(
  "orderTimeoutStatusChange",
  async (job) => {
    const { orderId, initialStatus, targetStatus } = job.attrs.data;
    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: { id: orderId, status: initialStatus },
        transaction,
      });
      if (order) await order.update({ status: targetStatus }, { transaction });
    });
  },
  {
    concurrency: 5,
  }
);

export default agenda;
