import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { prefixeReference } from "./metier";

export async function nouvelleReference(codeService: string, codePays: string) {
  const prefixe = prefixeReference(codeService, codePays);
  const annee = new Date().getFullYear();
  const racine = `${prefixe}-${annee}-`;

  for (let i = 0; i < 12; i++) {
    const n = await prisma.demande.count({
      where: { reference: { startsWith: racine } },
    });
    const reference = `${racine}${String(n + 1 + i).padStart(5, "0")}`;
    const clash = await prisma.demande.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!clash) return reference;
  }

  return `${racine}${randomBytes(4).toString("hex").toUpperCase()}`;
}
