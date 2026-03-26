import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: process.env.PG_HOST || "localhost",
      port: parseInt(process.env.PG_PORT || "5434"),
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "changeme",
      database: process.env.PG_DATABASE || "postgres",
    }),
  }),
});

export const auth = betterAuth({
  database: {
    db,
    type: "postgres",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [jwt()],
  trustedOrigins: [
    "http://localhost:3000",
  ],
});

export type Auth = typeof auth;