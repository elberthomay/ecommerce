import CustomError, { FormattedError } from "./CustomError";
import sequelize from "sequelize";

export default class DatabaseError extends CustomError {
  statusCode: number = 500;
  constructor(error: sequelize.DatabaseError) {
    super(error.message);
  }
  serializeError(): FormattedError {
    return {
      message: "Database error has occured",
      errors: { message: this.message },
    };
  }
}
