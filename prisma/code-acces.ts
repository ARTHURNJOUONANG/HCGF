import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import type { PrismaClient } from "../src/generated/prisma";

export const CLE_CODE_ROLES = "code_acces_roles";

export function fabriquerCodeAcces() {
  return `PD-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function fichiersCodeAcces() {
  const principal = process.env.CODE_ACCES_FICHIER || path.join(__dirname, "code-acces-pd.txt");
  const extras = [
    path.join(__dirname, "code-acces-pd.txt"),
    path.join(__dirname, "..", "data", "code-acces-pd.txt"),
  ];
  return [...new Set([principal, ...extras])];
}

function ecrireCodeAcces(brut: string) {
  const fichiers = fichiersCodeAcces();
  let premier = fichiers[0];
  for (const fichier of fichiers) {
    try {
      mkdirSync(path.dirname(fichier), { recursive: true });
      writeFileSync(fichier, `${brut}\n`, "utf8");
      if (!premier) premier = fichier;
    } catch {
      // Vercel / FS en lecture seule : le code est renvoyé à l’écran.
    }
  }
  return premier;
}

export async function assurerCodeAccesRoles(prisma: PrismaClient) {
  const existant = await prisma.secretInterne.findUnique({ where: { cle: CLE_CODE_ROLES } });
  if (existant) return { cree: false as const };

  const brut = fabriquerCodeAcces();
  await prisma.secretInterne.create({
    data: { cle: CLE_CODE_ROLES, valeur: await hash(brut, 10) },
  });
  const fichier = ecrireCodeAcces(brut);
  return { cree: true as const, brut, fichier };
}

export async function renouvelerCodeAccesRoles(prisma: PrismaClient) {
  const brut = fabriquerCodeAcces();
  const valeur = await hash(brut, 10);
  await prisma.secretInterne.upsert({
    where: { cle: CLE_CODE_ROLES },
    create: { cle: CLE_CODE_ROLES, valeur },
    update: { valeur },
  });
  const fichier = ecrireCodeAcces(brut);
  return { brut, fichier };
}
