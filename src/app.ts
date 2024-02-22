import express, { Request, Response, NextFunction } from "express";
import userRouter from "./routes/user";
import shopRouter from "./routes/shop";
import itemRouter from "./routes/item";
import tagRouter from "./routes/tag";
import cartRouter from "./routes/cart";
import orderRouter from "./routes/order";
import addressRouter from "./routes/address";
import errorHandler from "./middlewares/errorHandler";
import pathNotFound from "./middlewares/pathNotFound";
import cookieParser from "cookie-parser";
import cors from "cors";
import databaseErrorHandler from "./middlewares/databaseErrorHandler";
import multerErrorHandler from "./middlewares/multerErrorHandler";
import { CLIENT_HOST_NAME } from "./var/constants";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_HOST_NAME,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

app.options(
  "*",
  cors({
    origin: CLIENT_HOST_NAME,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

app.use("/api/user/", userRouter);
app.use("/api/shop/", shopRouter);
app.use("/api/item/", itemRouter);
app.use("/api/tag/", tagRouter);
app.use("/api/cart/", cartRouter);
app.use("/api/order/", orderRouter);
app.use("/api/address/", addressRouter);
app.use(pathNotFound);
app.use(multerErrorHandler);
app.use(databaseErrorHandler);
app.use(errorHandler);

export default app;
