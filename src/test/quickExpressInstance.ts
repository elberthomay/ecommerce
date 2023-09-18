import express from "express";

export default function quickExpressInstance(
  handler: express.Handler | express.Handler[]
) {
  const app = express();
  app.use(express.json());
  app.use(handler);
  return app;
}
