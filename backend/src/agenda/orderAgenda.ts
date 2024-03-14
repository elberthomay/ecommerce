import { OrderStatuses } from "@elycommerce/common";
import agenda, { orderTimeoutParamType } from "./agenda";

export async function setCancelOrderTimeout(
  orderId: string,
  timeout: Date,
  initialStatus: OrderStatuses
) {
  await agenda.schedule<orderTimeoutParamType>(
    timeout,
    "orderTimeoutStatusChange",
    { orderId, initialStatus, targetStatus: OrderStatuses.CANCELLED }
  );
}

export async function setDeliverOrder(orderId: string, timeout: Date) {
  await agenda.schedule<orderTimeoutParamType>(
    timeout,
    "orderTimeoutStatusChange",
    {
      orderId,
      initialStatus: OrderStatuses.DELIVERING,
      targetStatus: OrderStatuses.DELIVERED,
    }
  );
}
