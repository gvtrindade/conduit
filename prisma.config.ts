// Prisma ORM v7 configuration.
// Database connection for the Prisma CLI (migrations/introspection) lives here,
// not in schema.prisma. PowerSync remains the app's runtime data layer.
//
// Bun auto-loads .env, so no `import "dotenv/config"` is needed.
// We use `process.env.DATABASE_URL ?? ""` (not the `env()` helper) so that
// DB-less commands like `prisma validate` / `prisma generate` don't throw when
// DATABASE_URL is unset (e.g. in CI type-check).

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
    // Built from the existing PG_* vars; see .env.
    url: process.env.DATABASE_URL ?? "",
  },
});
