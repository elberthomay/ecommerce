import express, { Request, Response, NextFunction } from "express";
import User from "./models/User";
import Shop from "./models/Shop";
import Item from "./models/Item";

const app = express();
app.use(express.json());

app.use(async (req: Request, res: Response) => {
  try {
    const createdItem = await Item.create(
      {
        name: "blue pencil",
        description: "it's a pretty blue pencil",
        price: 123,
        quantity: 10,
        shop: {
          name: "blue coral",
          user: {
            email: "example@example.com",
            name: "bill nye",
            hash: "$2b$10$fDiqGlMfz.0UEIqRRnBbSuZp0czUkDE4JTYeiTgyWZyL0htjANHNK",
          },
        },
      },
      {
        include: [{ model: Shop, include: [User] }],
      }
    );
    const shop = createdItem.shop;
    await Item.create({
      name: "red leaf",
      description: "what, it's just an autumn leaf",
      price: 321,
      quantity: 1,
      shopId: createdItem.shop?.id ? createdItem.shop.id : "bregh",
    });
  } catch (e) {
    console.log(e);
  }
  const user = await User.findOne({
    where: {
      hash: "$2b$10$fDiqGlMfz.0UEIqRRnBbSuZp0czUkDE4JTYeiTgyWZyL0htjANHNK",
    },
    include: [{ model: Shop }],
  });
  console.log(await user?.shop?.$get("items"));
  if (user === null) {
    res.json({
      status: "success",
      data: {
        message: "It works!",
        name: "nonem",
      },
    });
  } else {
    res.json({
      status: "success",
      data: {
        message: "It works!",
        name: user.id,
      },
    });
  }
});

export default app;
