import Shop from "../models/Shop";

export interface ShopCreateType {
  name: Shop["name"];
}

export interface ShopParamType {
  shopId: Shop["id"];
}

export interface ShopQueryType {
  limit?: number;
  page?: number;
  orderBy?: string;
}
