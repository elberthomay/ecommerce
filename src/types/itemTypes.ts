import Item from "../models/Item";
import Tag from "../models/Tag";

export type ItemCreateType = Pick<
  Item,
  "name" | "description" | "price" | "quantity"
>;

export type ItemParamType = {
  itemId: Item["id"];
};

export interface ItemQueryType {
  limit?: number;
  page?: number;
  tagId?: Tag["id"];
  orderBy?: string;
}

export interface ItemUpdateType {
  name?: Item["name"];
  description?: Item["description"];
  price?: Item["price"];
  quantity?: Item["quantity"];
}
