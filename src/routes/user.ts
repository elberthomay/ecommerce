import { Router, Request, Response, NextFunction } from "express";
import { loginSchema, registerSchema } from "../schemas.ts/userSchema";
import validator from "../middlewares/validator";
import User, { UserCreationAttribute } from "../models/User";
import catchAsync from "../middlewares/catchAsync";
import bcrypt from "bcrypt";
import fetch from "../middlewares/fetch";
import InvalidLoginError from "../errors/InvalidLoginError";
import jwt from "jsonwebtoken";
import { TokenTypes } from "../types/TokenTypes";
import authenticate from "../middlewares/authenticate";
import { UserLoginType, UserRegisterType } from "../types/userTypes";
import { exist } from "joi";
import authorize from "../middlewares/authorize";
import { AuthorizationError } from "../errors/AuthorizationError";

const router = Router();

router.post(
  "/register",
  validator({ body: registerSchema }),
  fetch<UserCreationAttribute, UserRegisterType>({
    model: User,
    key: "email",
    location: "body",
    force: "absent",
  }),
  catchAsync(
    async (req: Request<unknown, unknown, UserRegisterType>, res: Response) => {
      const newUserData = req.body;
      const hash = await bcrypt.hash(newUserData.password, 10);
      const newUser = await User.create({ ...newUserData, hash });
      res.status(201).json({ status: "success", email: newUser.email });
    }
  )
);

router.post(
  "/createAdmin",
  validator({ body: registerSchema }),
  authenticate(true),
  fetch<UserCreationAttribute, UserRegisterType>({
    model: User,
    key: "email",
    location: "body",
    force: "absent",
  }),
  fetch<UserCreationAttribute, TokenTypes>({
    model: User,
    key: "id",
    location: "tokenData",
    destination: "currentUser",
    force: "exist",
  }),
  (req, res, next) => {
    const currentUser: User = (req as any).currentUser;
    if (currentUser.privilege !== 0) throw new AuthorizationError("User");
    else next();
  },
  catchAsync(
    async (req: Request<unknown, unknown, UserRegisterType>, res, next) => {
      const newUserData = req.body;
      const hash = await bcrypt.hash(newUserData.password, 10);
      const newUser = await User.create({ ...newUserData, hash, privilege: 1 });
      res.status(201).json({ status: "success", email: newUser.email });
    }
  )
);

// router.post("/verify")

router.post(
  "/login",
  validator({ body: loginSchema }),
  fetch<UserCreationAttribute, UserLoginType>({
    model: User,
    key: "email",
    location: "body",
    transformer: (user) => {
      //doesn't use force: "exist" to throw custom error type
      if (!user) throw new InvalidLoginError();
      return user;
    },
  }),
  catchAsync(
    async (req: Request<unknown, unknown, UserLoginType>, res: Response) => {
      const user: User = (req as any)[User.name];
      const loginData = req.body;
      const match = await bcrypt.compare(loginData.password, user.hash);
      if (match) {
        const tokenData: TokenTypes = { id: user.id };
        const tokenAge = loginData.rememberMe ? 2592000000 : 86400000; //one month or 1 day
        const token = jwt.sign(tokenData, process.env.JWT_SECRET!, {
          expiresIn: tokenAge.toString(),
        });
        res
          .cookie("jwt", token, { httpOnly: true, maxAge: tokenAge })
          .json({ status: "success" });
      } else {
        throw new InvalidLoginError();
      }
    }
  )
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
