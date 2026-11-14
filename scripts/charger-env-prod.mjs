import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.vercel");
if (!existsSync(envFile)) {
  console.error("Fichier .env.vercel manquant. Lance : npx vercel env pull .env.vercel --environment production --yes");
  process.exit(1);
}

for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

process.env.DATABASE_URL =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

export function chargerEnvProd() {
  return process.env.DATABASE_URL;
}

export function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: process.env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export function tryGenerateSqlite() {
  const result = spawnSync("npx", ["prisma", "generate"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    console.warn("Client SQLite local non régénéré (fichier Prisma verrouillé). Relance `npx prisma generate` après avoir arrêté Next.");
  }
}
