// Prisma client singleton for server-side access to the backend Postgres
// (the same DB PowerSync replicates from).
//
// PowerSync remains the app's client-side data layer. This client is used only
// by server routes (e.g. the PowerSync upload endpoint) that write directly to
// the backend Postgres, using the entities defined in prisma/schema.prisma.
//
// Prisma ORM v7 requires a driver adapter; @prisma/adapter-pg wraps `pg` and
// reads DATABASE_URL (mirrors the PG_* vars used by lib/auth's Pool).

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
