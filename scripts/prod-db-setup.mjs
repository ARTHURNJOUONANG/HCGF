import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.vercel");
if (!existsSync(envFile)) {
  console.error("Fichier .env.vercel manquant.");
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
if (!process.env.DATABASE_URL?.includes("postgres")) {
  console.error("DATABASE_URL Postgres introuvable.");
  process.exit(1);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: process.env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("node", ["scripts/prisma-postgres-schema.mjs"]);
run("npx", ["prisma", "generate", "--schema=prisma/schema.postgres.prisma"]);
run("npx", ["prisma", "db", "push", "--schema=prisma/schema.postgres.prisma", "--accept-data-loss"]);
run("npx", ["tsx", "prisma/seed.ts"]);
run("npx", ["prisma", "generate"]);

const vercel = join(root, "node_modules", ".bin", "vercel.cmd");
const secret = randomBytes(32).toString("hex");
const envTargets = "production,preview,development";
const auth = spawnSync(
  vercel,
  ["env", "add", "AUTH_SECRET", envTargets, "--yes", "--force", "--sensitive"],
  { cwd: root, input: secret, stdio: ["pipe", "inherit", "inherit"], shell: true },
);
if (auth.status !== 0) process.exit(auth.status ?? 1);
const appUrl = spawnSync(
  vercel,
  ["env", "add", "APP_URL", envTargets, "--yes", "--force", "--no-sensitive"],
  { cwd: root, input: "https://plateforme-avi.vercel.app", stdio: ["pipe", "inherit", "inherit"], shell: true },
);
if (appUrl.status !== 0) process.exit(appUrl.status ?? 1);

console.log("Base de production prête.");
