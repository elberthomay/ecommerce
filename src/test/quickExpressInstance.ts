import cookieParser from "cookie-parser";
import express, { Handler, ErrorRequestHandler } from "express";

export default function quickExpressInstance(
  handler: Handler | ErrorRequestHandler | (Handler | ErrorRequestHandler)[]
) {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(handler);
  return app;
}
