import { Router, Request, Response } from "express";
import authenticate from "../middlewares/authenticate";
import fetch from "../middlewares/fetch";
import User, { UserCreationAttribute } from "../models/User";
import { TokenTypes } from "../types/TokenTypes";
import catchAsync from "../middlewares/catchAsync";
import Shop from "../models/Shop";
import validator from "../middlewares/validator";
import {
  cartCreateSchema,
  cartDeleteSchema,
  cartOutputListSchema,
  cartOutputSchema,
  cartUpdateSchema,
} from "@elycommerce/common";
import Cart from "../models/Cart";
import NotFoundError from "../errors/NotFoundError";
import InventoryError from "../errors/InventoryError";
import Item, { ItemCreationAttribute } from "../models/Item";
import _ from "lodash";
import ItemImage from "../models/ItemImage";
import { z } from "zod";

const router = Router();

const updateHandler = catchAsync(
  async (
    req: Request<unknown, unknown, z.infer<typeof cartUpdateSchema>>,
    res: Response,
    next
  ) => {
    const currentUser: User = (req as any).currentUser;
    const updateData = req.body;
    const cart = await Cart.findOne({
      where: { userId: currentUser.id, itemId: updateData.itemId },
    });
    const item = await Item.findByPk(updateData.itemId);
    if (cart && item) {
      if (updateData.quantity !== undefined) {
        //check inventory if quantity has to be changed
        if (updateData.quantity === 0) return next(); // delete
        else if (item.quantity < updateData.quantity)
          throw new InventoryError();
      }
      await cart.set(updateData).save();
      res.json(cart);
    } else throw new NotFoundError("Cart");
  }
);

const deleteHandler = catchAsync(
  async (
    req: Request<unknown, unknown, z.infer<typeof cartDeleteSchema>>,
    res,
    next
  ) => {
    const currentUser: User = (req as any).currentUser;
    const itemId = req.body.itemId;
    const cart = await Cart.findOne({
      where: { userId: currentUser.id, itemId: itemId },
    });
    if (cart) {
      await cart.destroy();
      res.json({ status: "success" });
    } else throw new NotFoundError("Cart");
  }
);

router.get(
  "/",
  authenticate(true),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    destination: "currentUser",
    force: "exist",
  }),
  catchAsync(
    async (req, res: Response<z.infer<typeof cartOutputListSchema>>) => {
      const user: User = (req as any).currentUser;
      const cartItems = await Cart.findAll({
        where: { userId: user.id },
        attributes: ["itemId", "quantity", "selected"],
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Item,
            attributes: ["quantity", "name", "price", "shopId"],
            include: [
              { model: Shop, attributes: ["name"] },
              {
                model: ItemImage,
                attributes: ["imageName"],
                where: { order: 0 },
                required: false,
              },
            ],
          },
        ],
      });
      const result = cartItems.map(({ itemId, quantity, selected, item }) => ({
        itemId,
        quantity,
        selected,
        inventory: item?.quantity!,
        name: item?.name!,
        image: item?.images ? item?.images[0]?.imageName ?? null : null,
        price: item?.price!,
        shopId: item?.shopId!,
        shopName: item?.shop?.name!,
      }));
      res.json(result);
    }
  )
);

router.post(
  "/",
  authenticate(true),
  validator({ body: cartCreateSchema }),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    force: "exist",
    destination: "currentUser",
  }),
  fetch<ItemCreationAttribute, z.infer<typeof cartCreateSchema>>({
    model: Item,
    key: ["id", "itemId"],
    location: "body",
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof cartCreateSchema>>,
      res,
      next
    ) => {
      const currentUser: User = (req as any).currentUser;
      const newCartData = req.body;
      const cart = await Cart.findOne({
        where: { userId: currentUser.id, itemId: newCartData.itemId },
      });
      if (cart) {
        req.body.quantity += cart.quantity;
        return next(); //try to add quantity
      } else {
        const item: Item = (req as any)[Item.name];
        if (item.quantity < newCartData.quantity) throw new InventoryError();
        else {
          const newCart = await Cart.create({
            ...newCartData,
            userId: currentUser.id,
          });
          res.status(201).json(newCart);
        }
      }
    }
  ),
  updateHandler //update
);

router.patch(
  "/",
  authenticate(true),
  validator({ body: cartUpdateSchema }),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    destination: "currentUser",
    force: "exist",
  }),
  updateHandler,
  deleteHandler
);

router.delete(
  "/",
  authenticate(true),
  validator({ body: cartDeleteSchema }),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    force: "exist",
    destination: "currentUser",
  }),
  deleteHandler
);

export default router;
