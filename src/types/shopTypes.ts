import Shop, { ShopCreationAttribute } from "../models/Shop";

export interface ShopCreateType {
  name: ShopCreationAttribute["name"];
  description?: ShopCreationAttribute["description"];
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
