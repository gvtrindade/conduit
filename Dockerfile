# Stage 1: Dependencies Installation Stage

FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --no-save --frozen-lockfile


# Stage 2: Build Next.js application in standalone mode

FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build
RUN bun run postinstall


# Stage 3: Run Next.js application

FROM oven/bun:1 AS runner 

WORKDIR /app

COPY --from=builder --chown=bun:bun /app/public ./public

RUN mkdir .next
RUN chown bun:bun .next

COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

USER bun

EXPOSE 3000
CMD ["bun", "server.js"]