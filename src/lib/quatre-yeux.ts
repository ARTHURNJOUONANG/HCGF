import { prisma } from "./prisma";

export async function enregistrerControleQuatreYeux(opts: {
  idDemande: string;
  idVerificateur: string;
}) {
  const existante = await prisma.doubleValidation.findFirst({
    where: { idDemande: opts.idDemande, typeOperation: "signature" },
    orderBy: { createdAt: "desc" },
  });
  if (existante?.statut === "valide") return existante;
  if (existante?.statut === "verifie") return existante;

  return prisma.doubleValidation.create({
    data: {
      idDemande: opts.idDemande,
      typeOperation: "signature",
      idVerificateur: opts.idVerificateur,
      statut: "verifie",
    },
  });
}

export async function exigerQuatreYeuxSignature(idDemande: string, idSignataire: string) {
  const dv = await prisma.doubleValidation.findFirst({
    where: { idDemande, typeOperation: "signature", statut: "verifie" },
    orderBy: { createdAt: "desc" },
  });
  if (!dv) {
    return { error: "Un contrôleur distinct doit d’abord marquer les pièces conformes (quatre yeux)." };
  }
  if (dv.idVerificateur === idSignataire) {
    return { error: "L’administrateur ne peut pas être la personne qui a contrôlé le dossier." };
  }
  return { ok: true as const, validation: dv };
}

export async function cloreQuatreYeux(id: string, idValidateur: string) {
  const dv = await prisma.doubleValidation.findUnique({ where: { id } });
  if (!dv) return { error: "Validation introuvable." };
  if (dv.idVerificateur === idValidateur) {
    return { error: "L’administrateur ne peut pas être la personne qui a contrôlé le dossier." };
  }
  await prisma.doubleValidation.update({
    where: { id },
    data: { idValidateur, statut: "valide" },
  });
  return { ok: true as const };
}
