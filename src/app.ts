import express, { Request, Response, NextFunction } from "express";
import userRouter from "./routes/user";
import shopRouter from "./routes/shop";
import itemRouter from "./routes/item";
import tagRouter from "./routes/tag";
import cartRouter from "./routes/cart";
import orderRouter from "./routes/order";
import errorHandler from "./middlewares/errorHandler";
import pathNotFound from "./middlewares/pathNotFound";
import cookieParser from "cookie-parser";
import databaseErrorHandler from "./middlewares/databaseErrorHandler";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/user/", userRouter);
app.use("/api/shop/", shopRouter);
app.use("/api/item/", itemRouter);
app.use("/api/tag/", tagRouter);
app.use("/api/cart/", cartRouter);
app.use("/api/order/", orderRouter);
app.use(pathNotFound);
app.use(databaseErrorHandler);
app.use(errorHandler);

export default app;
