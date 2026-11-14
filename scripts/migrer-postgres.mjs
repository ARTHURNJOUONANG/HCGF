/**
 * Applique les migrations Postgres versionnées (prisma/postgres/migrations).
 *
 * Base existante créée autrefois par `db push` (sans historique de migrations) :
 * si elle correspond exactement au schéma, la migration initiale 0_init est
 * marquée comme appliquée (baseline), sans toucher aux données. Sinon, arrêt.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "--schema=prisma/postgres/schema.prisma";

function prisma(args, { capture = false } = {}) {
  const r = spawnSync("npx", ["prisma", ...args], {
    cwd: root,
    env: process.env,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
  });
  if (capture) {
    process.stdout.write(r.stdout ?? "");
    process.stderr.write(r.stderr ?? "");
  }
  return { status: r.status ?? 1, sortie: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  console.error("DATABASE_URL Postgres requis.");
  process.exit(1);
}

spawnSync("node", ["scripts/prisma-postgres-schema.mjs"], { cwd: root, stdio: "inherit" });

let deploy = prisma(["migrate", "deploy", SCHEMA], { capture: true });
if (deploy.status !== 0 && deploy.sortie.includes("P3005")) {
  console.log("\nBase existante sans historique de migrations : vérification avant baseline…");
  const diff = prisma(
    ["migrate", "diff", "--from-url", process.env.DATABASE_URL, "--to-schema-datamodel", "prisma/postgres/schema.prisma", "--exit-code"],
    { capture: true },
  );
  if (diff.status !== 0) {
    console.error(
      "\nLa base ne correspond pas au schéma (voir ci-dessus). Aucune donnée n’a été modifiée.\n" +
        "Alignez-la d’abord sans perte (npx prisma db push " + SCHEMA + ", SANS --accept-data-loss), puis relancez.",
    );
    process.exit(1);
  }
  const resolve = prisma(["migrate", "resolve", "--applied", "0_init", SCHEMA]);
  if (resolve.status !== 0) process.exit(resolve.status);
  deploy = prisma(["migrate", "deploy", SCHEMA]);
}
process.exit(deploy.status);
