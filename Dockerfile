FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_SECRET=build-placeholder
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY . .
RUN node scripts/prisma-postgres-schema.mjs \
  && npx prisma generate --schema=prisma/schema.postgres.prisma \
  && npm run build

ENV NODE_ENV=production
COPY docker-entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh && mkdir -p /data

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
