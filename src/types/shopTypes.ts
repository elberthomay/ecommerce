import Shop from "../models/Shop";

export interface ShopCreateType {
  name: Shop["name"];
  description?: Shop["description"];
}

export type ShopUpdateType = Partial<ShopCreateType>;

export interface ShopNameCheckType {
  name: Shop["name"];
}

export interface ShopParamType {
  shopId: Shop["id"];
}

export interface ShopQueryType {
  search?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
}
