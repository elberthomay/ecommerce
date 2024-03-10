import "dotenv/config";
import sequelize from "../models/sequelize";
import { createUser } from "./helpers/user/userHelper";
import { defaultRootUser } from "./helpers/user/userData";
import "jest-expect-message";

jest.mock("../agenda/orderAgenda");

beforeAll(async () => {
  try {
    await sequelize.sync({ force: true });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

beforeEach(async () => {
  jest.clearAllMocks();
  try {
    const models = Object.values(sequelize.models); //get all models in db
    for (const model of models) {
      await model.destroy({ where: {} });
    }
  } catch (err) {
    console.log(err);
  }
  // await sequelize.truncate({ cascade: true });
  await createUser([defaultRootUser]);
});

afterAll(async () => {
  sequelize.close();
});
