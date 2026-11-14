import { chargerEnvProd, run, tryGenerateSqlite } from "./charger-env-prod.mjs";

chargerEnvProd();
run("node", ["scripts/prisma-postgres-schema.mjs"]);
run("npx", ["prisma", "generate", "--schema=prisma/postgres/schema.prisma"]);
run("node", ["scripts/migrer-postgres.mjs"]);
run("npx", ["tsx", "prisma/seed.ts"]);
tryGenerateSqlite();
console.log("Migrations et catalogue de production à jour, sans suppression des dossiers.");
