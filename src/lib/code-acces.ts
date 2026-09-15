import { compare } from "bcryptjs";
import { prisma } from "./prisma";

const CLE_CODE_ROLES = "code_acces_roles";

export async function verifierCodeAccesRoles(code: string) {
  const saisi = code
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
  if (!saisi) return false;
  const fallback = (process.env.STAFF_ACCESS_CODE ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (fallback && saisi === fallback) return true;
  const secret = await prisma.secretInterne.findUnique({ where: { cle: CLE_CODE_ROLES } });
  if (!secret?.valeur) return false;
  return compare(saisi, secret.valeur.trim());
}
