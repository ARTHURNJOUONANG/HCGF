import { prisma } from "./prisma";
import { ecrireAudit, notifier } from "./lot2";
import { traiterRelancesDues } from "./lot8";
import { traiterEcheancesDues } from "./lot8";

const JOUR_MS = 24 * 60 * 60 * 1000;

export async function expirerDelegations() {
  const today = new Date().toISOString().slice(0, 10);
  const expirees = await prisma.delegation.findMany({
    where: {
      statut: "active",
      AND: [{ dateFin: { not: null } }, { dateFin: { lt: today } }],
    },
    select: { id: true, idMandataire: true, idDemande: true },
  });
  if (expirees.length === 0) return { expirees: 0 };

  await prisma.delegation.updateMany({
    where: { id: { in: expirees.map((d) => d.id) } },
    data: { statut: "expiree", revokedAt: new Date(), motifRevocation: "Date de fin atteinte" },
  });

  for (const d of expirees) {
    await notifier(
      d.idMandataire,
      "delegation",
      "Délégation expirée",
      "La période du mandat est terminée. Vous n’avez plus accès aux dossiers concernés.",
      d.idDemande ?? undefined,
    );
    await ecrireAudit(null, "delegation_expiree", "delegation", d.id, d.idDemande, "cron");
  }
  return { expirees: expirees.length };
}

export async function purgerTracesAuth() {
  const limite = new Date(Date.now() - 30 * JOUR_MS);
  const [evenements, sessions, jetons] = await Promise.all([
    prisma.evenementAuth.deleteMany({ where: { createdAt: { lt: limite } } }),
    prisma.sessionAuth.deleteMany({
      where: { OR: [{ expireAt: { lt: new Date() } }, { revoqueeAt: { not: null, lt: limite } }] },
    }),
    prisma.jetonReinitialisation.deleteMany({
      where: { OR: [{ expireAt: { lt: new Date() } }, { utiliseAt: { not: null, lt: limite } }] },
    }),
  ]);
  return {
    evenements: evenements.count,
    sessions: sessions.count,
    jetons: jetons.count,
  };
}

export async function classerOperationsApiStale() {
  const tropVieux = new Date(Date.now() - 7 * JOUR_MS);
  const resultat = await prisma.operationApi.updateMany({
    where: {
      statut: "service_indisponible",
      updatedAt: { lt: tropVieux },
      nbTentatives: { gte: 5 },
    },
    data: { statut: "abandonne" },
  });
  return { abandonnees: resultat.count };
}

export async function executerMaintenance() {
  const [relances, echeances, delegations, traces, api] = await Promise.all([
    traiterRelancesDues(),
    traiterEcheancesDues(),
    expirerDelegations(),
    purgerTracesAuth(),
    classerOperationsApiStale(),
  ]);
  return { relances, echeances, delegations, traces, api };
}
