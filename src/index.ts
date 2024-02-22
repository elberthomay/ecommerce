import "dotenv/config";
import app from "./app";
import sequelize from "./models/sequelize";

(async () => {
  if (
    !process.env.DB_NAME ||
    !process.env.DB_USERNAME ||
    !process.env.DB_PASSWORD
  )
    console.error("database secret value not set");
  else if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
    console.error("AWS secret value not set");
  else if (
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CALLBACK_URL
  )
    console.error("Google OAuth secret value not set");
  else if (!process.env.JWT_SECRET) console.error("JWT secret value not set");
  else {
    try {
      await sequelize.sync();
      console.log("Database connection established");
      app.listen(3000, () => {
        console.log("listening to port 3000");
      });
    } catch (e) {
      console.log("error connecting to database");
      console.log(e);
    }
  }
})();
