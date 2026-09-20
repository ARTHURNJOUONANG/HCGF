import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compare, hash } from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.vercel");
const codeFile = join(root, "prisma", "code-acces-pd.txt");
if (!existsSync(envFile) || !existsSync(codeFile)) {
  console.error("Fichiers d’environnement ou de code manquants.");
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

const brut = readFileSync(codeFile, "utf8").trim().toUpperCase();

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: process.env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("node", ["scripts/prisma-postgres-schema.mjs"]);
run("npx", ["prisma", "generate", "--schema=prisma/schema.postgres.prisma"]);

const { PrismaClient } = await import("../src/generated/prisma/index.js");
const prisma = new PrismaClient();
const CLE = "code_acces_roles";

try {
  const secret = await prisma.secretInterne.findUnique({ where: { cle: CLE } });
  const ok = secret ? await compare(brut, secret.valeur.trim()) : false;
  console.log("secret_present", Boolean(secret));
  console.log("hash_length", secret?.valeur?.length ?? 0);
  console.log("code_ok", ok);
  if (!ok) {
    const valeur = await hash(brut, 10);
    await prisma.secretInterne.upsert({
      where: { cle: CLE },
      create: { cle: CLE, valeur },
      update: { valeur },
    });
    const verif = await prisma.secretInterne.findUnique({ where: { cle: CLE } });
    console.log("code_ok_after_update", verif ? await compare(brut, verif.valeur.trim()) : false);
  }
} finally {
  await prisma.$disconnect();
  run("npx", ["prisma", "generate"]);
}
