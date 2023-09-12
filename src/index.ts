import app from "./app";
import sequelize from "./models/sequelize";

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("Database connection established");
    app.listen(3000, () => {
      console.log("listening to port 3000");
    });
  } catch (e) {
    console.log("error connecting to database");
    console.log(e);
  }
})();
