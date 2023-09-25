import Cart from "../models/Cart";
import Item from "../models/Item";

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
