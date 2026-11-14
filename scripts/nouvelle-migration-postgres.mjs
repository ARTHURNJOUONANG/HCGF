/**
 * Crée la migration Postgres correspondant aux changements de prisma/schema.prisma.
 * Usage : SHADOW_DATABASE_URL=postgresql://… npm run db:migration:pg -- nom_de_la_migration
 * (la base « shadow » est vidée par Prisma : jamais la base de production).
 * Pensez aussi à la migration SQLite : npx prisma migrate dev --name nom_de_la_migration
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nom = (process.argv[2] ?? "").replace(/[^a-z0-9_]/gi, "_");
const shadow = process.env.SHADOW_DATABASE_URL;
if (!nom || !shadow?.startsWith("postgres")) {
  console.error("Usage : SHADOW_DATABASE_URL=postgresql://… npm run db:migration:pg -- nom_de_la_migration");
  process.exit(1);
}

spawnSync("node", ["scripts/prisma-postgres-schema.mjs"], { cwd: root, stdio: "inherit" });
const r = spawnSync(
  "npx",
  [
    "prisma", "migrate", "diff",
    "--from-migrations", "prisma/postgres/migrations",
    "--to-schema-datamodel", "prisma/postgres/schema.prisma",
    "--shadow-database-url", shadow,
    "--script",
  ],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" },
);
if (r.status !== 0) {
  process.stderr.write(r.stderr ?? "");
  process.exit(r.status ?? 1);
}
if (!r.stdout.trim() || r.stdout.includes("empty migration")) {
  console.log("Aucun changement de schéma : pas de migration créée.");
  process.exit(0);
}
const horodatage = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const dossier = join(root, "prisma", "postgres", "migrations", `${horodatage}_${nom}`);
mkdirSync(dossier, { recursive: true });
writeFileSync(join(dossier, "migration.sql"), r.stdout);
console.log(`Migration créée : ${dossier}`);
