import { Router, Request, Response, NextFunction } from "express";
import {
  LoginType,
  RegisterType,
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
  fetch<UserCreationAttribute, RegisterType>({
    model: User,
    key: "email",
    location: "body",
    force: "absent",
  }),
  catchAsync(async (req: Request, res: Response) => {
    const newUserData: RegisterType = req.body;
    const hash = await bcrypt.hash(newUserData.password, 10);
    const newUser = await User.create({ ...newUserData, hash });
    res.json({ status: "success", email: newUser.email });
  })
);

// router.post("/verify")

router.post(
  "/login",
  validator({ body: loginSchema }),
  fetch<UserCreationAttribute, LoginType>({
    model: User,
    key: "email",
    location: "body",
    transformer: (user) => {
      if (!user) throw new InvalidLoginError();
      return user;
    },
  }),
  catchAsync(async (req: Request, res: Response) => {
    const user: User = (req as any)[User.name];
    const data: LoginType = req.body;
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
  })
);

router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie("jwt").json({ status: "success" });
});

router.get(
  "/",
  authenticate(false),
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tokenData = (req as any).tokenData as TokenTypes | null;
    if (tokenData) {
      const user = await User.findByPk(tokenData.id);
      res.json(user);
    } else res.json({});
  })
);

export default router;
