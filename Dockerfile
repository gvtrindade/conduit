# Stage 1: Dependencies Installation Stage
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --no-save --frozen-lockfile --ignore-scripts

# Stage 2: Build Next.js application in standalone mode
FROM oven/bun:1 AS builder

WORKDIR /app

# Build-time environment variables for Next.js public vars
ARG NEXT_PUBLIC_POWERSYNC_URL
ARG NEXT_PUBLIC_POWERSYNC_TOKEN
ARG NEXT_PUBLIC_NFCE_API_URL
ARG NEXT_PUBLIC_PROJECT_URL
ENV NEXT_PUBLIC_POWERSYNC_URL=$NEXT_PUBLIC_POWERSYNC_URL
ENV NEXT_PUBLIC_POWERSYNC_TOKEN=$NEXT_PUBLIC_POWERSYNC_TOKEN
ENV NEXT_PUBLIC_NFCE_API_URL=$NEXT_PUBLIC_NFCE_API_URL
ENV NEXT_PUBLIC_PROJECT_URL=$NEXT_PUBLIC_PROJECT_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run prebuild
RUN bun run build
RUN bun run postinstall

# Stage 3: Run Next.js application
FROM oven/bun:1 AS runner

WORKDIR /app

ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=bun:bun /app/public ./public

RUN mkdir .next
RUN chown bun:bun .next

COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

# Full node_modules over the standalone subset: the standalone tracer prunes
# Prisma-CLI-only deps (effect, c12, @prisma/engines, etc.) that `prisma migrate
# deploy` needs at container start. The builder's node_modules is a superset.
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules

# Prisma config + schema + migrations (needed by `prisma migrate deploy`).
COPY --from=builder --chown=bun:bun /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=bun:bun /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=bun:bun /app/prisma/migrations ./prisma/migrations

# Entrypoint applies migrations, then starts the server.
COPY --chown=bun:bun docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER bun

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]