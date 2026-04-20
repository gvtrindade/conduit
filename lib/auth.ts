import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_PROJECT_URL || "https://localhost:3000",
  trustedOrigins: [
    "https://localhost:3000",
    "https://192.168.1.9:3000",
    "http://localhost:8080",
  ],
  database: new Pool({
    host: "localhost",
    port: 5434,
    database: "postgres",
    user: "postgres",
    password: "changeme",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: {
          alg: "RS256",
        },
      },
    }),
  ],
});
