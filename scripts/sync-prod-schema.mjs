import { chargerEnvProd, run, tryGenerateSqlite } from "./charger-env-prod.mjs";

chargerEnvProd();
run("node", ["scripts/prisma-postgres-schema.mjs"]);
run("npx", ["prisma", "generate", "--schema=prisma/schema.postgres.prisma"]);
run("npx", ["prisma", "db", "push", "--schema=prisma/schema.postgres.prisma"]);
run("npx", ["tsx", "prisma/seed.ts"]);
tryGenerateSqlite();
console.log("Schéma et catalogue de production mis à jour, sans suppression des dossiers.");
