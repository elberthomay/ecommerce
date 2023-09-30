import sequelize from "../models/sequelize";

beforeAll(async () => {
  process.env.JWT_SECRET = "secret";
  process.env.NODE_ENV = "test";

  await sequelize.sync({ force: true });
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
});

afterAll(async () => {
  sequelize.close();
});
