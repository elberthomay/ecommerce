import "dotenv/config";
import app from "./app";
import sequelize from "./models/sequelize";
import { DatabaseError } from "sequelize";
import agenda from "./agenda/agenda";

(async () => {
  if (
    !process.env.DB_NAME ||
    !process.env.BACKEND_DB_USERNAME ||
    !process.env.BACKEND_DB_PASSWORD
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
      await sequelize.authenticate();
      console.log("Database connection established");
      await agenda.start();
      app.listen(3000, () => {
        console.log("listening to port 3000");
      });
    } catch (e) {
      if (e instanceof DatabaseError)
        console.log("error connecting to database:\n", e);
      else console.log(e);
    }
  }
})();
