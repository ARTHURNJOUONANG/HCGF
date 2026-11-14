import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Le schéma Postgres vit dans prisma/postgres/ pour avoir ses propres migrations
// (prisma/migrations reste réservé à SQLite, verrouillé par migration_lock.toml).
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
if (!source.includes('provider = "sqlite"') || !source.includes('output   = "../src/generated/prisma"')) {
  console.error("prisma/schema.prisma : provider ou output inattendu, conversion Postgres impossible.");
  process.exit(1);
}
const postgres = source
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('output   = "../src/generated/prisma"', 'output   = "../../src/generated/prisma"');
mkdirSync(join(root, "prisma", "postgres"), { recursive: true });
writeFileSync(join(root, "prisma", "postgres", "schema.prisma"), postgres);
