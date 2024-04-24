import { DB } from "./schema"; // this is the Database interface we defined earlier
import { createPool } from "mysql2"; // do not use 'mysql2/promises'!
import { Kysely, MysqlDialect } from "kysely";

const dialect = new MysqlDialect({
  pool: createPool({
    database: process.env.DB_NAME ?? "ecommerce_test",
    host: process.env.DB_HOST ?? "ecommerce-db-srv",
    user: process.env.BACKEND_DB_USERNAME!,
    password: process.env.BACKEND_DB_PASSWORD!,
    port: 3306,
    connectionLimit: 10,
    timezone: "Z",
    supportBigNumbers: true,
  }),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
  dialect,
});
