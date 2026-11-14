import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Le seed réécrit aussi ces fichiers de code PD (en plus de CODE_ACCES_FICHIER) :
// on les restaure pour ne pas casser la connexion équipe du développeur.
const FICHIERS_CODE_PD = ["prisma/code-acces-pd.txt", "data/code-acces-pd.txt"];

/** Recrée prisma/test.db : migrations SQLite + catalogue et comptes démo. */
export default function setup() {
  const env = {
    ...process.env,
    DATABASE_URL: "file:./test.db",
    SEED_DEMO: "1",
    CODE_ACCES_FICHIER: "prisma/test-code-acces-pd.txt",
  };
  const sauvegardes = FICHIERS_CODE_PD.map((f) => [f, existsSync(f) ? readFileSync(f) : null] as const);
  try {
    for (const f of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(f, { force: true });
    execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
    execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
  } finally {
    for (const [fichier, contenu] of sauvegardes) {
      if (contenu === null) rmSync(fichier, { force: true });
      else writeFileSync(fichier, contenu);
    }
  }
}
