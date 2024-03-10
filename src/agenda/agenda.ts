import { Agenda } from "@hokify/agenda";
import Order, { OrderStatuses } from "../models/Order";
import sequelize from "../models/sequelize";

const mongoConnectionString = "mongodb://agenda-mongo-srv/agenda";

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
