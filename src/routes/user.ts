import { Router, Request, Response, NextFunction } from "express";
import {
  LoginData,
  RegisterData,
  loginSchema,
  registerSchema,
} from "../schemas.ts/userSchema";
import validator from "../middlewares/validator";
import User, { UserCreationAttribute } from "../models/User";
import catchAsync from "../middlewares/catchAsync";
import DuplicateDataError from "../errors/DuplicateDataError";
import bcrypt from "bcrypt";
import DatabaseError from "../errors/DatabaseError";
import fetch from "../middlewares/fetch";
import InvalidLoginError from "../errors/InvalidLoginError";
import jwt from "jsonwebtoken";
import { TokenTypes } from "../types/TokenTypes";
import authenticate from "../middlewares/authenticate";

const router = Router();

router.post(
  "/register",
  validator({ body: registerSchema }),
  fetch<UserCreationAttribute, RegisterData>(User, "email", "body"),
  catchAsync(async (req: Request, res: Response) => {
    const data: RegisterData = req.body;

    if (!(req as any)[User.name]) {
      //if user doesn't exist
      const hash = await bcrypt.hash(data.password, 10);
      try {
        const newUser = await User.create({ ...data, hash });
        res.json({ status: "success", email: newUser.email });
      } catch (error: any) {
        throw new DatabaseError(error);
      }
    } else {
      throw new DuplicateDataError("email");
    }
  })
);

// router.post("/verify")

router.post(
  "/login",
  validator({ body: loginSchema }),
  fetch<UserCreationAttribute, LoginData>(User, "email", "body"),
  catchAsync(async (req: Request, res: Response) => {
    const user: User = (req as any)[User.name];
    const data: LoginData = req.body;
    if (user) {
      //if user exist
      const result = await bcrypt.compare(data.password, user.hash);
      if (result) {
        const tokenData: TokenTypes = { id: user.id };
        const maxAge = data.rememberMe ? 2592000000 : 86400000; //one month or 1 day
        const token = jwt.sign(tokenData, process.env.JWT_SECRET!, {
          expiresIn: maxAge.toString(),
        });
        res
          .cookie("jwt", token, { httpOnly: true, maxAge })
          .json({ status: "success" });
      } else {
        throw new InvalidLoginError();
      }
    } else throw new InvalidLoginError();
  })
);

router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie("jwt").json({ status: "success" });
});

router.get(
  "/",
  authenticate(false),
  (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User | undefined = (req as any).currentUser;
    if (currentUser) res.json(currentUser);
    else res.json({});
  }
);

export default router;
