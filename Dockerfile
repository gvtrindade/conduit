# Stage 1: Dependencies Installation Stage
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --no-save --frozen-lockfile

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

RUN bun run build
RUN bun run postinstall

# Stage 3: Run Next.js application
FROM oven/bun:1 AS runner 

WORKDIR /app

# Runtime environment variables (can be overridden at runtime)
ENV BETTER_AUTH_SECRET=""
ENV BETTER_AUTH_URL=""
ENV GOOGLE_CLIENT_ID=""
ENV GOOGLE_CLIENT_SECRET=""
ENV PG_HOST=""
ENV PG_PORT=""
ENV PG_USER=""
ENV PG_PASSWORD=""
ENV PG_DATABASE=""
ENV NFCE_WEBHOOK_API_KEY=""


COPY --from=builder --chown=bun:bun /app/public ./public

RUN mkdir .next
RUN chown bun:bun .next

COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

USER bun

ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["bun", "server.js"]