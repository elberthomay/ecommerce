import { Request, Router } from "express";
import validator from "../middlewares/validator";
import catchAsync from "../middlewares/catchAsync";
import City, { cityCreationAttribute } from "../models/City";
import fetch from "../middlewares/fetch";
import authenticate from "../middlewares/authenticate";
import {
  cityCreateSchema,
  cityIdSchema,
  cityUpdateSchema,
} from "../schemas.ts/citySchema";
import { cityCreateType, cityIdType, cityUpdateType } from "../types/cityType";
import { authorization } from "../middlewares/authorize";

const router = Router();

const authorizeStaffOnly = authorization([0], "City");

//return list of cities(id and name only)
router.get(
  "/",
  catchAsync(async (req, res) => {
    const cities = City.findAll({ attributes: ["id", "name"] });
    res.json(cities);
  })
);

router.get(
  "/:cityId",
  validator({ params: cityIdSchema }),
  fetch<cityCreationAttribute, cityIdType>({
    model: City,
    location: "params",
    key: ["id", "cityId"],
    force: "exist",
  }),
  (req, res) => {
    const city: City = (req as any)[City.name];
    res.json(city);
  }
);

router.post(
  "/",
  authenticate(true),
  authorizeStaffOnly,
  validator({ body: cityCreateSchema }),
  fetch<cityCreationAttribute, cityCreateType>({
    model: City,
    location: "body",
    key: "name",
    force: "absent",
  }),
  catchAsync(async (req: Request<unknown, unknown, cityCreateType>, res) => {
    const newCityData = req.body;
    const newCity = await City.create(newCityData);
    res.json(newCity);
  })
);

router.patch(
  "/:cityId",
  authenticate(true),
  authorizeStaffOnly,
  validator({ params: cityIdSchema, body: cityUpdateSchema }),
  fetch<cityCreationAttribute, cityIdType>({
    model: City,
    location: "params",
    key: ["id", "cityId"],
    force: "exist",
  }),
  fetch<cityCreationAttribute, cityUpdateType>({
    model: City,
    location: "body",
    key: "name",
    force: "absent",
  }),
  catchAsync(async (req: Request<unknown, unknown, cityUpdateType>, res) => {
    const city: City = (req as any)[City.name];
    const cityUpdateData = req.body;
    const updatedCity = await city.set(cityUpdateData).save();
    res.json(updatedCity);
  })
);

router.delete(
  "/:cityId",
  authenticate(true),
  authorizeStaffOnly,
  validator({ params: cityIdSchema }),
  fetch<cityCreationAttribute, cityIdType>({
    model: City,
    location: "params",
    key: ["id", "cityId"],
    force: "exist",
  }),
  catchAsync(async (req: Request, res) => {
    const city: City = (req as any)[City.name];
    await city.destroy();
    res.json({ status: "success" });
  })
);
