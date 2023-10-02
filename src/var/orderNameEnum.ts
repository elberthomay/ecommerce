import { ItemCreationAttribute } from "../models/Item";

const orderNameEnum: {
  [key: string]: [keyof ItemCreationAttribute, "ASC" | "DESC"];
} = {
  cheapest: ["price", "ASC"],
  newest: ["createdAt", "ASC"],
  mostExpensive: ["price", "DESC"],
};
export default orderNameEnum;
