"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { clearSession, revoquerSessions, requireUser, sidCourant } from "./auth";
import { ecrireAudit } from "./lot2";

const DOSSIERS_OUVERTS = ["brouillon", "en_traitement"];

export async function exporterDonnees() {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };

  const [profil, demandes, delegations, acceptations, sessions] = await Promise.all([
    prisma.profilCandidat.findUnique({ where: { idUtilisateur: user.id } }),
    prisma.demande.findMany({
      where: { idUtilisateur: user.id },
      select: {
        id: true,
        reference: true,
        statut: true,
        createdAt: true,
        offre: { select: { codePays: true, codeService: true } },
        documents: { select: { nom: true, type: true, statut: true, createdAt: true } },
      },
    }),
    prisma.delegation.findMany({
      where: { OR: [{ idMandant: user.id }, { idMandataire: user.id }] },
      select: { statut: true, dateDebut: true, dateFin: true, idMandant: true, idMandataire: true },
    }),
    prisma.acceptation.findMany({
      where: { idUtilisateur: user.id },
      select: { dateAcceptation: true, idDocumentContractuel: true, idDemande: true },
    }),
    prisma.sessionAuth.findMany({
      where: { idUtilisateur: user.id },
      select: { createdAt: true, expireAt: true, ip: true, revoqueeAt: true },
    }),
  ]);

  await ecrireAudit(user.id, "export_rgpd", "utilisateur", user.id, null, user.email);
  return {
    ok: true as const,
    donnees: {
      compte: {
        email: user.email,
        typeCompte: user.typeCompte,
        role: user.role,
        createdAt: user.createdAt,
        derniereConnexion: user.derniereConnexion,
      },
      profil,
      demandes,
      delegations,
      acceptations,
      sessions,
    },
  };
}

export async function listerSessionsActives() {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const actuel = await sidCourant();
  const sessions = await prisma.sessionAuth.findMany({
    where: { idUtilisateur: user.id, revoqueeAt: null, expireAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, ip: true, userAgent: true },
  });
  return {
    ok: true as const,
    actuel,
    sessions: sessions.map((s) => ({ ...s, courante: s.id === actuel })),
  };
}

export async function revoquerAutresSessions() {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const actuel = await sidCourant();
  await prisma.sessionAuth.updateMany({
    where: { idUtilisateur: user.id, revoqueeAt: null, ...(actuel ? { id: { not: actuel } } : {}) },
    data: { revoqueeAt: new Date() },
  });
  await ecrireAudit(user.id, "sessions_revoquees", "utilisateur", user.id, null, "autres");
  revalidatePath("/compte");
  return { ok: true as const };
}

export async function fermerMonCompte(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  if (String(formData.get("confirmation") ?? "").trim() !== "FERMER") {
    return { error: "Saisissez FERMER pour confirmer." };
  }
  if (user.typeCompte === "collaborateur") {
    return { error: "Un compte équipe se ferme depuis le bureau, pas ici." };
  }

  const ouverts = await prisma.demande.count({
    where: { idUtilisateur: user.id, statut: { in: DOSSIERS_OUVERTS } },
  });
  if (ouverts > 0) {
    return { error: "Clôturez ou abandonnez vos dossiers ouverts avant de fermer le compte." };
  }

  const emailArchive = `ferme.${user.id.slice(-8)}@hcgf.invalid`;
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      email: emailArchive,
      statut: "inactif",
      profil: user.profil
        ? { update: { nom: "Compte", prenom: "Fermé", telephone: null, adresse: null } }
        : undefined,
    },
  });
  await revoquerSessions(user.id);
  await ecrireAudit(user.id, "compte_ferme", "utilisateur", user.id, null, emailArchive);
  await clearSession();
  redirect("/");
}
