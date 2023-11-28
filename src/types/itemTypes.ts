import Item from "../models/Item";
import ItemImage from "../models/ItemImage";
import Shop from "../models/Shop";
import Tag from "../models/Tag";

export type ItemCreateType = Pick<
  Item,
  "name" | "description" | "price" | "quantity"
> & { tags?: Tag["id"][] };

export type ItemParamType = {
  itemId: Item["id"];
};

export interface ItemQueryType {
  search?: string;
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

export interface ItemGetOutputType {
  id: Item["id"];
  name: Item["name"];
  price: Item["price"];
  quantity: Item["quantity"];
  shopId: Shop["id"];
  shopName: Shop["name"];
  image?: ItemImage["imageName"];
}

export interface ItemDetailsOutputType {
  id: Item["id"];
  name: Item["name"];
  price: Item["price"];
  description: Item["description"];
  quantity: Item["quantity"];
  shopId: Shop["id"];
  shopName: Shop["name"];
  tags: { id: Tag["id"]; name: Tag["name"] }[];
  images: { imageName: ItemImage["imageName"]; order: ItemImage["order"] }[];
}
