import Item from "../models/Item";
import Tag from "../models/Tag";

export type ItemCreateType = Pick<
  Item,
  "name" | "description" | "price" | "quantity"
> & { tags?: Tag["id"][] };

export type ItemParamType = {
  itemId: Item["id"];
};

export interface ItemQueryType {
  limit?: number;
  page?: number;
  tagIds?: string;
  orderBy?: string;
}

export interface ItemUpdateType {
  name?: Item["name"];
  description?: Item["description"];
  price?: Item["price"];
  quantity?: Item["quantity"];
}

export interface ItemTagEditType {
  tags: Tag["id"][];
}
