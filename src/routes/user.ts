import { Router, Request, Response, NextFunction } from "express";
import {
  userUpdateSchema,
  loginSchema,
  registerSchema,
} from "../schemas/userSchema";
import validator from "../middlewares/validator";
import User, { UserCreationAttribute } from "../models/User";
import catchAsync from "../middlewares/catchAsync";
import bcrypt from "bcrypt";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import InvalidLoginError from "../errors/InvalidLoginError";
import { TokenTypes } from "../types/TokenTypes";
import authenticate from "../middlewares/authenticate";
import { AuthorizationError } from "../errors/AuthorizationError";
import processImage from "../middlewares/processImage";
import s3Client from "../helper/s3Client";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, CLIENT_HOST_NAME } from "../var/constants";
import { v4 as uuid } from "uuid";
import Cart from "../models/Cart";
import passport from "passport";

import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import PasswordUnsetError from "../errors/PasswordUnsetError";
import createToken from "../middlewares/createToken";
import { VerifyCallback } from "jsonwebtoken";
import { GoogleProfileType } from "../types/authType";
import oauth2ErrorHandler from "../middlewares/oauth2ErrorHandler";
import { z } from "zod";

const localStrategy = new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
    session: false,
  },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ where: { email } });
      if (user && user.hash) {
        const match = await bcrypt.compare(password, user.hash);
        if (match) return done(null, user);
        else return done(new InvalidLoginError());
      } else if (user) return done(new PasswordUnsetError());
      else return done(new InvalidLoginError());
    } catch (e) {
      return done(e);
    }
  }
);

const oauth2Strategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    scope: ["email", "profile"],
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  },
  async (
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfileType,
    done: VerifyCallback<User>
  ) => {
    const { displayName, email } = profile;

    const user = await User.findOne({ where: { email } });
    if (user) return done(null, user);
    else {
      const newUser = await User.create({
        email,
        name: displayName.slice(0, 60),
      });
      return done(null, newUser);
    }
  }
);

passport.use("local", localStrategy);
passport.use("oauth2", oauth2Strategy);

const router = Router();

router.post(
  "/register",
  validator({ body: registerSchema }),
  fetch<UserCreationAttribute, z.infer<typeof registerSchema>>({
    model: User,
    key: "email",
    location: "body",
    force: "absent",
  }),
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof registerSchema>>,
      res: Response
    ) => {
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
  fetch<UserCreationAttribute, z.infer<typeof registerSchema>>({
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
    async (
      req: Request<unknown, unknown, z.infer<typeof registerSchema>>,
      res,
      next
    ) => {
      const newUserData = req.body;
      const hash = await bcrypt.hash(newUserData.password, 10);
      const newUser = await User.create({ ...newUserData, hash, privilege: 1 });
      res.status(201).json({ status: "success", email: newUser.email });
    }
  )
);

// router.post("/verify")

router.post(
  "/login/password",
  validator({ body: loginSchema }),
  passport.authenticate("local", { session: false }),
  createToken,
  (req: Request, res: Response) => res.json({ status: "success" })
);

router.get("/login/auth", passport.authenticate("oauth2"));

router.get(
  "/login/auth/callback",
  passport.authenticate("oauth2", {
    session: false,
  }),
  createToken,
  (req: Request, res: Response) =>
    res.redirect(new URL("auth/check", CLIENT_HOST_NAME).toString())
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
      const currentUser = await User.findByPk(tokenData.id, {
        attributes: [
          "id",
          "name",
          "email",
          "privilege",
          "avatar",
          "selectedAddressId",
        ],
        raw: true,
      });
      if (!currentUser) return res.clearCookie("jwt").json({});
      else {
        const cartCount = await Cart.count({
          where: { userId: currentUser.id },
        });
        const result = { ...currentUser, cartCount };
        return res.json(result);
      }
    } else res.json({});
  })
);

//upload new avatar image
router.post(
  "/avatar",
  authenticate(true),
  processImage("hasPicture", 1),
  fetchCurrentUser,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User = (req as any).currentUser;
    const images = req.files as Express.Multer.File[];
    const imageName = `${uuid()}.webp`;
    const currentAvatar = currentUser.avatar ?? "undefined";

    await Promise.all(
      [
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: imageName,
          Body: images[0].buffer,
        }),
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: currentAvatar,
        }),
      ].map((command) => s3Client.send(command))
    );

    await currentUser.update({ avatar: imageName });
    res.status(200).json({ status: "success" });
  })
);

//update normal user data
router.patch(
  "/",
  authenticate(true),
  validator({ body: userUpdateSchema }),
  fetchCurrentUser,
  catchAsync(
    async (
      req: Request<unknown, unknown, z.infer<typeof userUpdateSchema>>,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      const updateData = req.body;
      const fields: "name"[] = ["name"];
      //access fields one by one
      fields.forEach((field) => {
        if (field in updateData)
          currentUser.set({ [field]: updateData[field] });
      });
      await currentUser.save();

      const { id, name, email, privilege, avatar, selectedAddressId } =
        currentUser;
      const cartCount = await Cart.count({ where: { userId: currentUser.id } });
      const result = {
        id,
        name,
        email,
        privilege,
        avatar,
        selectedAddressId,
        cartCount,
      };
      res.status(200).json(result);
    }
  )
);

router.use(oauth2ErrorHandler);

export default router;
