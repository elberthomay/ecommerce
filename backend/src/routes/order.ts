import { Router, Request, Response, NextFunction } from "express";
import authenticate from "../middlewares/authenticate";
import User, { UserCreationAttribute } from "../models/User";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import { TokenTypes } from "../types/TokenTypes";
import catchAsync from "../middlewares/catchAsync";
import Cart from "../models/Cart";
import UserAddress from "../models/UserAddress";
import Address from "../models/Address";
import Order, { OrderCreationAttribute } from "../models/Order";
import {
  cancelOrder,
  confirmOrder,
  createOrders,
  deliverOrder,
  getOrderDetail,
  getOrderItem,
  getOrders,
} from "../models/helpers/orderHelpers";
import {
  getOrdersOption,
  formatGetOrders,
  getOrdersParam,
  getOrdersQuery,
  orderStatusChangeParams,
  formatOrderItem,
  getOrderItemParam,
  formatOrderDetail,
  formatOrder,
  OrderStatuses,
  getOrderDetailOutputSchema,
  orderItemOutputSchema,
  getOrdersOutputSchema,
} from "@elycommerce/common";
import { authorization } from "../middlewares/authorize";
import validator from "../middlewares/validator";
import { z } from "zod";
import Shop, { ShopCreationAttribute } from "../models/Shop";
import OrderItem from "../models/OrderItem";
import { getOrderItemImageInclude } from "../models/OrderItemImage";
import sequelize from "../models/sequelize";
import NoAddressSelectedError from "../errors/NoAddressSelectedError";
import { addMinutes } from "date-fns";
import {
  AWAITING_CONFIRMATION_TIMEOUT_MINUTE,
  CONFIRMED_TIMEOUT_MINUTE,
} from "../var/constants";

const router = Router();

interface IGetOrdersRequest
  extends Request<
    z.infer<typeof getOrdersParam>,
    unknown,
    unknown,
    z.infer<typeof getOrdersQuery>
  > {
  currentUser?: User;
  queryUser?: User;
  queryShop?: Shop;
}

interface IOrderStatusChangeRequest
  extends Request<z.infer<typeof getOrdersParam>> {
  currentUser?: User;
  order?: Order;
  shop?: Shop | null;
}

interface IOrderStatusCancelRequest extends IOrderStatusChangeRequest {
  side?: "shop" | "user";
}

interface IGetOrderItemRequest
  extends Request<z.infer<typeof getOrderItemParam>> {
  currentUser?: User;
  order?: Order;
  shop?: Shop;
}

const authorizeAdminOrShopOwner = authorization(
  [
    0,
    1,
    (req: IGetOrdersRequest) => {
      const shop = req.queryShop;
      return !!shop && req.currentUser?.id === shop?.userId;
    },
  ],
  "Order"
);

const authorizeAdminOrOrderShopOwner = authorization(
  [
    0,
    1,
    (req: IOrderStatusChangeRequest) => {
      const order = req.order;
      const shop = req.shop;
      if (order === undefined || shop === undefined)
        throw Error("order or shop not loaded");
      return !!shop && order.shopId === shop.id;
    },
  ],
  "Order"
);

const authorizeAdminOrderShopOwnerOrUser = authorization(
  [
    0,
    1,
    (req: IOrderStatusCancelRequest) => {
      const currentUser = req.currentUser;
      const order = req.order;
      const currentShop = req.shop;
      if (!order || !currentUser)
        throw Error("order or currentUser not loaded");
      if (order.shopId === currentShop?.id) req.side = "shop";
      else if (order.userId === currentUser.id) req.side = "user";
      return (
        order.shopId === currentShop?.id || order.userId === currentUser.id
      );
    },
  ],
  "Order"
);

// get order of given user
router.get(
  "/user/:userId",
  authenticate(true),
  validator({ params: getOrdersParam, query: getOrdersQuery }),
  fetchCurrentUser,
  fetch<UserCreationAttribute, z.infer<typeof getOrdersParam>>({
    model: User,
    location: "params",
    key: ["id", "userId"],
    force: "exist",
    destination: "queryUser",
  }),
  authorization(
    [
      0,
      1,
      (req: IGetOrdersRequest) => {
        const paramUserId = req.params.userId;
        return req.currentUser?.id === paramUserId;
      },
    ],
    "Order"
  ),
  catchAsync(
    async (req: IGetOrdersRequest, res: Response, next: NextFunction) => {
      const user = req.queryUser;
      const options: z.infer<typeof getOrdersOption> = {
        ...req.query,
        userId: user!.id,
      };
      const orders: z.infer<typeof getOrdersOutputSchema> = await getOrders(
        options
      );
      res.json(orders);
    }
  )
);

// get orders of the given shop
router.get(
  "/shop/:shopId",
  authenticate(true),
  validator({ params: getOrdersParam, query: getOrdersQuery }),
  fetchCurrentUser,
  fetch<ShopCreationAttribute, z.infer<typeof getOrdersParam>>({
    model: Shop,
    location: "params",
    key: ["id", "shopId"],
    force: "exist",
    destination: "queryShop",
  }),
  authorizeAdminOrShopOwner,
  catchAsync(
    async (req: IGetOrdersRequest, res: Response, next: NextFunction) => {
      const shop = req.queryShop;
      const options: z.infer<typeof getOrdersOption> = {
        ...req.query,
        shopId: shop!.id,
      };
      const orders: z.infer<typeof getOrdersOutputSchema> = await getOrders(
        options
      );
      res.json(orders);
    }
  )
);

// get item snapshot of an order item
router.get(
  "/:orderId/item/:itemId",
  authenticate(true),
  validator({ params: getOrderItemParam }),
  fetchCurrentUser,
  fetch<OrderCreationAttribute, z.infer<typeof getOrderItemParam>>({
    model: Order,
    location: "params",
    key: ["id", "orderId"],
    destination: "order",
    force: "exist",
  }),
  fetch<OrderCreationAttribute, TokenTypes>({
    model: Shop,
    location: "tokenData",
    key: ["userId", "id"],
    destination: "shop",
  }),
  authorizeAdminOrderShopOwnerOrUser,
  catchAsync(
    async (req: IGetOrderItemRequest, res: Response, next: NextFunction) => {
      const { orderId, itemId } = req.params;
      const orderItemData: z.infer<typeof orderItemOutputSchema> =
        await getOrderItem(orderId, itemId);
      res.json(orderItemData);
    }
  )
);

// get order detail of the given id
router.get(
  "/:orderId",
  authenticate(true),
  validator({ params: orderStatusChangeParams, query: getOrdersQuery }),
  fetchCurrentUser,
  fetch<OrderCreationAttribute, z.infer<typeof getOrderItemParam>>({
    model: Order,
    location: "params",
    key: ["id", "orderId"],
    destination: "order",
    force: "exist",
  }),
  fetch<OrderCreationAttribute, TokenTypes>({
    model: Shop,
    location: "tokenData",
    key: ["userId", "id"],
    destination: "shop",
  }),
  authorizeAdminOrderShopOwnerOrUser,
  catchAsync(
    async (req: IGetOrderItemRequest, res: Response, next: NextFunction) => {
      const orderId = req.params.orderId;
      const orderData: z.infer<typeof getOrderDetailOutputSchema> =
        await getOrderDetail(orderId);
      res.json(orderData);
    }
  )
);

router.post(
  "/process",
  authenticate(true),
  fetchCurrentUser,
  catchAsync(async (req, res) => {
    const currentUser: User = (req as any).currentUser;
    const selectedAddressId = currentUser.selectedAddressId; // get selected user id
    if (!selectedAddressId) throw new NoAddressSelectedError();
    const userAddress = await UserAddress.findOne({
      where: { addressId: selectedAddressId, userId: currentUser.id },
      include: [Address],
    });

    const selectedCarts = await Cart.findAll({
      where: { userId: currentUser.id, selected: true },
    });
    const orders = await createOrders(selectedCarts, userAddress!);
    const result = formatGetOrders.parse(
      orders.map((order) => ({
        ...order.toJSON(),
        timeout: addMinutes(
          order.updatedAt!,
          AWAITING_CONFIRMATION_TIMEOUT_MINUTE
        ).toISOString(),
      }))
    );
    return res.json(result);
  })
);

const orderStatusChangeMiddlewareChain = [
  authenticate(true),
  validator({ params: orderStatusChangeParams }),
  fetchCurrentUser,
  fetch<OrderCreationAttribute, z.infer<typeof orderStatusChangeParams>>({
    model: Order,
    location: "params",
    key: ["id", "orderId"],
    destination: "order",
    include: [
      Shop,
      {
        model: OrderItem,
        attributes: ["id", "name", "price", "quantity"],
        include: [getOrderItemImageInclude("items")],
      },
    ],
    order: [
      sequelize.literal("`items`.`name` ASC"),
      sequelize.literal("`items->images`.`order` ASC"),
      // [OrderItem, "name", "ASC"],
      // ["items.images", "order", "ASC"],
    ],
    force: "exist",
  }),
  fetch<OrderCreationAttribute, TokenTypes>({
    model: Shop,
    location: "tokenData",
    key: ["userId", "id"],
    destination: "shop",
  }),
];

router.post(
  "/:orderId/confirm",
  orderStatusChangeMiddlewareChain,
  authorizeAdminOrOrderShopOwner,
  catchAsync(
    async (
      req: IOrderStatusChangeRequest,
      res: Response,
      next: NextFunction
    ) => {
      const order = req.order!;
      const updatedOrder: Order = await confirmOrder(order);
      const timeout = addMinutes(
        updatedOrder.updatedAt!,
        CONFIRMED_TIMEOUT_MINUTE
      ).toISOString();
      const orderWithTimeout = { ...updatedOrder.toJSON(), timeout };
      const result = await formatOrder.parseAsync(orderWithTimeout);
      res.json(result);
    }
  )
);
router.post(
  "/:orderId/deliver",
  orderStatusChangeMiddlewareChain,
  authorizeAdminOrOrderShopOwner,
  catchAsync(
    async (
      req: IOrderStatusChangeRequest,
      res: Response,
      next: NextFunction
    ) => {
      const order = req.order!;
      const updatedOrder: Order = await deliverOrder(order);
      const result = await formatOrder.parseAsync(updatedOrder);
      res.json(result);
    }
  )
);
router.post(
  "/:orderId/cancel",
  orderStatusChangeMiddlewareChain,
  authorizeAdminOrderShopOwnerOrUser,
  catchAsync(
    async (
      req: IOrderStatusCancelRequest,
      res: Response,
      next: NextFunction
    ) => {
      const order = req.order!;
      const updatedOrder: Order = await cancelOrder(order, req.side);
      const result = await formatOrder.parseAsync(updatedOrder);
      res.json(result);
    }
  )
);

export default router;
