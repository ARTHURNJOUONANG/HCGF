import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { CLE_CODE_ROLES, renouvelerCodeAccesRoles as renouveler } from "../../prisma/code-acces";

function normaliserCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

export async function verifierCodeAccesRoles(code: string) {
  const saisi = normaliserCode(code);
  if (!saisi) return false;
  const secret = await prisma.secretInterne.findUnique({ where: { cle: CLE_CODE_ROLES } });
  if (!secret?.valeur) return false;
  return compare(saisi, secret.valeur.trim());
}

export async function renouvelerCodeAccesRoles() {
  return renouveler(prisma);
}
