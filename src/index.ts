import "dotenv/config";
import app from "./app";
import sequelize from "./models/sequelize";

(async () => {
  try {
    await sequelize.sync();
    console.log("Database connection established");
    process.env.JWT_SECRET ??= "secret";
    app.listen(3000, () => {
      console.log("listening to port 3000");
    });
  } catch (e) {
    console.log("error connecting to database");
    console.log(e);
  }
})();
