import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import User, { UserCreationAttribute } from "../models/User";
import fetch from "../middlewares/fetch";
import { TokenTypes } from "../types/TokenTypes";
import catchAsync from "../middlewares/catchAsync";
import Cart from "../models/Cart";
import Item from "../models/Item";
import sequelize from "../test/sequelizeTest";
import InventoryError from "../errors/InventoryError";
import Shop from "../models/Shop";
import ChangedInventory from "../errors/ChangedInventory";

const router = Router();

// router.post(
//   "/",
//   authenticate(true),
//   fetch<UserCreationAttribute, TokenTypes>({
//     model: User,
//     key: "id",
//     location: "tokenData",
//     destination: "currentUser",
//     force: "exist",
//   }),
//   catchAsync(async (req, res) => {
//     const currentUser: User = (req as any).currentUser;
//     let itemsInCart: (Item & { Cart: Cart })[] = (await currentUser.$get(
//       "itemsInCart",
//       {
//         include: [Shop],
//       }
//     )) as any;

//     itemsInCart = itemsInCart.filter((item) => item.Cart.selected);

//     if (itemsInCart.length === 0) return res.status(204).send();
//     else if (itemsInCart.some((item) => item.Cart.quantity > item.quantity))
//       throw new InventoryError();
//     else {
//       const transaction = await sequelize.transaction();
//       try {
//         itemsInCart.forEach(async (item) => {
//           const [updatedRowCount] = await Item.update(
//             {
//               quantity: (item.quantity -= item.Cart.quantity),
//             },
//             {
//               where: {
//                 id: item.id,
//                 updatedAt: item.updatedAt,
//               },
//               transaction,
//             }
//           );
//           if (updatedRowCount === 0) throw new Error("update failed");
//           await item.destroy({ transaction });
//         });
//         await transaction.commit();
//         res.json({ status: "success" });
//       } catch (err) {
//         await transaction.rollback();
//         throw new Error("order failed");
//       }
//     }
//   })
// );

router.post(
  "/",
  authenticate(true),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    destination: "currentUser",
    force: "exist",
  }),
  catchAsync(async (req, res) => {
    const currentUser: User = (req as any).currentUser;
    // const itemsInCart: (Item & { Cart: Cart })[] = (await currentUser.$get(
    //   "itemsInCart",
    //   {
    //     where: { selected: true },
    //     include: [Shop],
    //   }
    // )) as any;

    const carts = await Cart.findAll({
      where: { userId: currentUser.id, selected: true },
      include: Item,
    });

    console.log(
      carts.map((cart) => ({
        quantity: cart.quantity,
        inventory: cart.item?.quantity,
      }))
    );

    if (carts.length === 0) return res.status(204).send();
    else if (carts.some((cart) => cart.quantity > cart.item!.quantity))
      throw new InventoryError();
    else {
      const transaction = await sequelize.transaction();
      try {
        await Promise.all(
          carts.map(async (cart) => {
            const [updatedRowCount] = await Item.update(
              { quantity: (cart.item!.quantity -= cart.quantity) },
              {
                where: {
                  id: cart.item!.id,
                  updatedAt: cart.item!.updatedAt,
                },
                transaction,
              }
            );
            if (updatedRowCount === 0) throw new Error("update failed");
            await cart.destroy({ transaction });
          })
        );
        await transaction.commit();
        res.json({ status: "success" });
      } catch (err) {
        await transaction.rollback();
        throw new ChangedInventory();
      }
    }
  })
);

export default router;
