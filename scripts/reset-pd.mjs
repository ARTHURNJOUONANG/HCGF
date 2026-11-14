import { PrismaClient } from "../src/generated/prisma/index.js";
import { renouvelerCodeAccesRoles } from "../prisma/code-acces.ts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const r = await renouvelerCodeAccesRoles(prisma);

const copies = [
  r.fichier,
  path.join(process.cwd(), "prisma", "code-acces-pd.txt"),
  path.join(process.cwd(), "data", "code-acces-pd.txt"),
];
for (const f of [...new Set(copies)]) {
  try {
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, `${r.brut}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

console.log("NOUVEAU_CODE=" + r.brut);
for (const f of [...new Set(copies)]) {
  if (existsSync(f)) console.log("OK " + f + " → " + readFileSync(f, "utf8").trim());
}
await prisma.$disconnect();
