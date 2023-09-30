// import sequelize from "../models/sequelize";
import sequelize from "../test/sequelizeTest";

beforeAll(async () => {
  process.env.JWT_SECRET = "secret";
  process.env.NODE_ENV = "test";

  await sequelize.sync();
});

beforeEach(async () => {
  jest.clearAllMocks();
  const models = Object.values(sequelize.models); //get all models in db
  await Promise.all(models.map((model) => model.destroy({ where: {} }))); //truncate them all
  // await sequelize.truncate({ cascade: true });
});

afterAll(async () => {
  sequelize.close();
});
