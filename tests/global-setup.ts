import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Recrée prisma/test.db : migrations SQLite + catalogue et comptes démo. */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./test.db", SEED_DEMO: "1" };
  for (const f of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(f, { force: true });
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
