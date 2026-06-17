# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY scripts/link-workspace-deps.mjs ./scripts/
RUN npm ci

FROM deps AS build
COPY . .
ENV ASTRO_TELEMETRY_DISABLED=1
ENV HOST=0.0.0.0
ENV PORT=4321
RUN npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY scripts/link-workspace-deps.mjs ./scripts/
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

RUN apk add --no-cache wget su-exec

WORKDIR /app/apps/web

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/web/node_modules /app/apps/web/node_modules
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/server.mjs ./server.mjs
COPY --from=build /app/apps/web/server ./server
COPY --from=build /app/apps/web/migrate.sh ./migrate.sh
COPY --from=build /app/apps/web/start.sh ./start.sh
COPY --from=build /app/apps/web/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=build /app/apps/web/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/apps/web/drizzle ./drizzle
COPY --from=build /app/apps/web/src/db/schema.ts ./src/db/schema.ts
COPY --from=build /app/clickhouse/schema.sql /app/clickhouse/schema.sql

RUN mkdir -p public/uploads \
  && chmod +x migrate.sh start.sh docker-entrypoint.sh \
  && chown -R node:node /app

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]
CMD ["./start.sh"]
