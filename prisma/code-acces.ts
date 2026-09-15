import { writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import type { PrismaClient } from "../src/generated/prisma";

export const CLE_CODE_ROLES = "code_acces_roles";

export function fabriquerCodeAcces() {
  return `PD-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function assurerCodeAccesRoles(prisma: PrismaClient) {
  const existant = await prisma.secretInterne.findUnique({ where: { cle: CLE_CODE_ROLES } });
  if (existant) return { cree: false as const };

  const brut = fabriquerCodeAcces();
  await prisma.secretInterne.create({
    data: { cle: CLE_CODE_ROLES, valeur: await hash(brut, 10) },
  });

  const fichier = path.join(__dirname, "code-acces-pd.txt");
  writeFileSync(fichier, `${brut}\n`, "utf8");
  return { cree: true as const, brut, fichier };
}
