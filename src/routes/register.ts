import { Router, Request, Response, NextFunction } from "express";
import { registerSchema } from "../schemas.ts/registerSchema";
import validator from "../middlewares/validator";

const router = Router();

router.post(
  "/user/register",
  validator({ body: registerSchema }),
  async (req: Request, res: Response) => {}
);
