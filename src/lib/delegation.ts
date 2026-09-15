import { prisma } from "./prisma";
export { DROITS_DELEGABLES } from "./droits";

export function delegationEncoreValide(d: {
  statut: string;
  dateFin: string | null;
  revokedAt: Date | null;
}) {
  if (d.statut !== "active" || d.revokedAt) return false;
  if (d.dateFin && d.dateFin < new Date().toISOString().slice(0, 10)) return false;
  return true;
}

export async function droitsSurDemande(userId: string, typeCompte: string, demandeId: string) {
  if (typeCompte === "collaborateur") return "all" as const;
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    select: { id: true, idUtilisateur: true },
  });
  if (!demande) return null;
  if (demande.idUtilisateur === userId) return "all" as const;

  const delegations = await prisma.delegation.findMany({
    where: {
      idMandataire: userId,
      idMandant: demande.idUtilisateur,
      statut: "active",
      OR: [{ idDemande: null }, { idDemande: demande.id }],
    },
    include: { droits: true },
  });
  const valide = delegations.find((d) => delegationEncoreValide(d));
  if (!valide) return null;
  return new Set(valide.droits.map((d) => d.codeDroit));
}

export function aLeDroit(droits: Set<string> | "all" | null, code: string) {
  if (droits === "all") return true;
  if (!droits) return false;
  return droits.has(code);
}

export async function demandesDeleguees(userId: string) {
  const delegations = await prisma.delegation.findMany({
    where: { idMandataire: userId, statut: "active" },
    include: {
      droits: true,
      mandant: { include: { profil: true } },
      demande: { include: { offre: { include: { pays: true, service: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const actives = delegations.filter(delegationEncoreValide);
  const ids = new Set<string>();
  for (const d of actives) {
    if (d.idDemande) ids.add(d.idDemande);
    else {
      const toutes = await prisma.demande.findMany({
        where: { idUtilisateur: d.idMandant },
        select: { id: true },
      });
      for (const t of toutes) ids.add(t.id);
    }
  }
  return { delegations: actives, ids: [...ids] };
}
