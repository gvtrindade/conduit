#!/bin/sh
set -e

# Migrations + server startup entrypoint.
#
# `prisma.config.ts` reads DATABASE_URL directly, but docker-compose ships the
# PG_* vars instead (see lib/auth.ts). Build DATABASE_URL from those when it
# isn't already provided, mirroring lib/auth.ts defaults.
if [ -z "${DATABASE_URL:-}" ]; then
  PG_USER="${PG_USER:-postgres}"
  PG_PASSWORD="${PG_PASSWORD:-changeme}"
  PG_HOST="${PG_HOST:-localhost}"
  PG_PORT="${PG_PORT:-5432}"
  PG_DATABASE="${PG_DATABASE:-postgres}"
  export DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}"
fi

cd /app

# Apply pending migrations against the backend Postgres. Call the prisma CLI
# entry directly (avoids relying on node_modules/.bin symlink presence).
echo "» prisma migrate deploy"
node ./node_modules/prisma/build/index.js migrate deploy

# Hand off to the Next.js standalone server.
exec node server.js