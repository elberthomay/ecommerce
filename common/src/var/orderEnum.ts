export const orderNameEnum: {
  [key: string]: [string, "ASC" | "DESC"];
} = {
  cheapest: ["price", "ASC"],
  newest: ["createdAt", "DESC"],
  oldest: ["createdAt", "ASC"],
  mostExpensive: ["price", "DESC"],
};

export enum OrderStatuses {
  AWAITING = "awaiting",
  CONFIRMED = "confirmed",
  DELIVERING = "delivering",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}
