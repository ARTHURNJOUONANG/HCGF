import { compare } from "bcryptjs";
import { prisma } from "./prisma";

const CLE_CODE_ROLES = "code_acces_roles";

export async function verifierCodeAccesRoles(code: string) {
  const saisi = code.trim();
  if (!saisi) return false;
  const secret = await prisma.secretInterne.findUnique({ where: { cle: CLE_CODE_ROLES } });
  if (!secret) return false;
  return compare(saisi, secret.valeur);
}
