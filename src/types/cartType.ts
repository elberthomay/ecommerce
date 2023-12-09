import Cart from "../models/Cart";
import Item from "../models/Item";
import ItemImage from "../models/ItemImage";
import Shop from "../models/Shop";

export interface cartCreateType {
  itemId: Item["id"];
  quantity: Cart["quantity"];
  selected: Cart["selected"];
}

export interface cartUpdateType {
  itemId: Item["id"];
  quantity?: Cart["quantity"];
  selected?: Cart["selected"];
}

export interface cartDeleteType {
  itemId: Item["id"];
}

export interface cartOutputType {
  inventory: Item["quantity"];
  itemId: Item["id"];
  name: Item["name"];
  price: Item["price"];
  image: ItemImage["imageName"] | null;
  quantity: Cart["quantity"];
  selected: Cart["selected"];
  shopId: Shop["id"];
  shopName: Shop["name"];
}
