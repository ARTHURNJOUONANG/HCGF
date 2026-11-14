#!/bin/sh
set -e
node scripts/prisma-postgres-schema.mjs
npx prisma generate --schema=prisma/postgres/schema.prisma
node scripts/migrer-postgres.mjs
npx tsx prisma/seed.ts
exec npx next start -H 0.0.0.0 -p 3000
