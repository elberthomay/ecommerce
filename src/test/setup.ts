import { Model, ModelCtor } from "sequelize-typescript";
import app from "../app";
import sequelizeTest from "./sequelizeTest";

beforeAll(async () => {
  process.env.JWT_SECRET = "secret";
  process.env.NODE_ENV = "test";

  await sequelizeTest.sync();
});

beforeEach(async () => {
  jest.clearAllMocks();
  const models = Object.values(sequelizeTest.models);
  await Promise.all(models.map((model) => model.truncate({ cascade: true })));
});

afterAll(async () => {
  sequelizeTest.close();
});
