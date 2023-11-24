import Cart from "../models/Cart";
import Item from "../models/Item";
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
  quantity: Cart["quantity"];
  selected: Cart["selected"];
  shopId: Shop["id"];
  shopName: Shop["name"];
}
