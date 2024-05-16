import type { ColumnType } from "kysely";

export type Decimal = ColumnType<string, number | string, number | string>;

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface Addresses {
  city: string;
  country: string;
  createdAt: Date | null;
  detail: string;
  district: string | null;
  id: string;
  latitude: Decimal | null;
  longitude: Decimal | null;
  name: string;
  phoneNumber: string;
  postCode: string | null;
  province: string;
  recipient: string;
  subdistrictId: number | null;
  updatedAt: Date | null;
  village: string | null;
}

export interface Cart {
  createdAt: Date;
  itemId: string;
  quantity: Generated<number>;
  selected: Generated<number>;
  updatedAt: Date;
  userId: string;
}

export interface Cities {
  createdAt: Date;
  id: Generated<number>;
  latitude: Decimal;
  longitude: Decimal;
  name: string;
  updatedAt: Date;
}

export interface Item {
  createdAt: Date;
  description: string;
  id: string;
  name: string;
  price: number;
  quantity: Generated<number>;
  shopId: string;
  updatedAt: Date;
  version: Generated<number>;
}

export interface ItemImages {
  createdAt: Date;
  imageName: string;
  itemId: string;
  order: number;
  updatedAt: Date;
}

export interface ItemRatingAggregate {
  itemId: string;
  reviewAverage: number;
  reviewCount: number;
}

export interface ItemTag {
  createdAt: Date;
  itemId: string;
  tagId: number;
  updatedAt: Date;
}

export interface Order {
  addressDetail: string;
  city: string;
  country: string;
  createdAt: Date;
  district: string | null;
  id: string;
  image: string | null;
  latitude: Decimal | null;
  longitude: Decimal | null;
  name: string;
  phoneNumber: string;
  province: string;
  recipient: string;
  shopId: string;
  status: Generated<"awaiting" | "cancelled" | "confirmed" | "delivered" | "delivering">;
  totalPrice: number;
  updatedAt: Date;
  userId: string;
  village: string | null;
}

export interface OrderItem {
  createdAt: Date;
  description: string;
  id: string;
  name: string;
  price: number;
  updatedAt: Date;
  version: Generated<number>;
}

export interface OrderItemImage {
  createdAt: Date;
  imageName: string;
  itemId: string;
  order: number;
  updatedAt: Date;
  version: number;
}

export interface OrderOrderItem {
  createdAt: Date;
  itemId: string;
  orderId: string;
  quantity: Generated<number>;
  updatedAt: Date;
  version: number;
}

export interface Review {
  anonymous: number;
  createdAt: Date;
  id: Generated<number>;
  itemId: string;
  orderId: string;
  rating: number;
  review: string | null;
  updatedAt: Date;
}

export interface ReviewImage {
  imageName: string;
  order: number;
  reviewId: number;
}

export interface ReviewLikes {
  likes: number;
  reviewId: number;
  userId: string;
}

export interface Shop {
  avatar: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
  userId: string;
}

export interface ShopAddresses {
  addressId: string;
  createdAt: Date;
  selected: Generated<number>;
  shopId: string;
  updatedAt: Date;
}

export interface Subdistricts {
  cityId: number;
  createdAt: Date;
  id: Generated<number>;
  latitude: Decimal;
  longitude: Decimal;
  name: string;
  postCodes: string;
  updatedAt: Date;
}

export interface Tag {
  createdAt: Date;
  id: Generated<number>;
  name: string;
  updatedAt: Date;
}

export interface User {
  avatar: string | null;
  createdAt: Date;
  email: string;
  hash: string | null;
  id: string;
  name: string;
  privilege: Generated<number>;
  selectedAddressId: string | null;
  updatedAt: Date;
}

export interface UserAddresses {
  addressId: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface DB {
  Addresses: Addresses;
  Cart: Cart;
  Cities: Cities;
  Item: Item;
  ItemImages: ItemImages;
  ItemRatingAggregate: ItemRatingAggregate;
  ItemTag: ItemTag;
  Order: Order;
  OrderItem: OrderItem;
  OrderItemImage: OrderItemImage;
  OrderOrderItem: OrderOrderItem;
  Review: Review;
  ReviewImage: ReviewImage;
  ReviewLikes: ReviewLikes;
  Shop: Shop;
  ShopAddresses: ShopAddresses;
  Subdistricts: Subdistricts;
  Tag: Tag;
  User: User;
  UserAddresses: UserAddresses;
}
