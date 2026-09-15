import { prisma } from "./prisma";

export async function signalerPiecePartagee(opts: {
  documentId: string;
  hash: string;
  idDemande: string;
}) {
  if (!opts.hash) return null;

  const autres = await prisma.document.findMany({
    where: {
      hash: opts.hash,
      id: { not: opts.documentId },
      NOT: { idDemande: opts.idDemande },
    },
    take: 8,
    select: { id: true, idDemande: true, demande: { select: { reference: true } } },
  });
  if (autres.length === 0) return null;

  const ouverte = await prisma.alerteFraude.findFirst({
    where: {
      idDemande: opts.idDemande,
      typeSignal: "document_partage",
      statut: { not: "levee" },
    },
  });
  if (ouverte) return ouverte;

  const refs = [...new Set(autres.map((d) => d.demande.reference))].join(", ");
  const alerte = await prisma.alerteFraude.create({
    data: {
      idDemande: opts.idDemande,
      typeSignal: "document_partage",
      niveau: "eleve",
      statut: "ouverte",
      detail: `Même empreinte SHA-256 déjà vue sur ${refs}. Pas de rejet automatique.`,
    },
  });

  await prisma.demande.update({
    where: { id: opts.idDemande },
    data: { controleRenforce: true },
  });
  await prisma.tacheInterne.create({
    data: {
      idDemande: opts.idDemande,
      action: "Contrôle renforcé — pièce déjà présente sur un autre dossier",
      priorite: "urgent",
    },
  });
  await prisma.journalAudit.create({
    data: {
      idActeur: null,
      action: "alerte_fraude",
      objetType: "alerte",
      objetId: alerte.id,
      idDemande: opts.idDemande,
      detail: alerte.detail,
    },
  });
  return alerte;
}

export async function leverAlerteFraude(alerteId: string, idActeur: string) {
  const alerte = await prisma.alerteFraude.update({
    where: { id: alerteId },
    data: { statut: "levee" },
  });
  const restantes = await prisma.alerteFraude.count({
    where: { idDemande: alerte.idDemande, statut: { not: "levee" } },
  });
  if (restantes === 0) {
    await prisma.demande.update({
      where: { id: alerte.idDemande },
      data: { controleRenforce: false },
    });
  }
  await prisma.journalAudit.create({
    data: {
      idActeur,
      action: "lever_fraude",
      objetType: "alerte",
      objetId: alerte.id,
      idDemande: alerte.idDemande,
      detail: "levée manuelle",
    },
  });
  return alerte;
}
