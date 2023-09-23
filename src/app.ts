import express, { Request, Response, NextFunction } from "express";
import userRouter from "./routes/user";
import shopRouter from "./routes/shop";
import itemRouter from "./routes/item";
import errorHandler from "./middlewares/errorHandler";
import pathNotFound from "./middlewares/pathNotFound";
import cookieParser from "cookie-parser";
import databaseErrorHandler from "./middlewares/databaseErrorHandler";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/user/", userRouter);
app.use("/api/shop/", shopRouter);
app.use("/api/item", itemRouter);
app.use(pathNotFound);
app.use(databaseErrorHandler);
app.use(errorHandler);

export default app;
