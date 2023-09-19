import { Model, ModelCtor } from "sequelize-typescript";
import sequelizeTest from "./sequelizeTest";

beforeAll(async () => {
  process.env.JWT_SECRET = "secret";
  process.env.NODE_ENV = "test";

  await sequelizeTest.sync();
});

beforeEach(async () => {
  jest.clearAllMocks();
  const models = Object.values(sequelizeTest.models); //get all models in db
  await Promise.all(models.map((model) => model.truncate({ cascade: true }))); //truncate them all
});

afterAll(async () => {
  sequelizeTest.close();
});
