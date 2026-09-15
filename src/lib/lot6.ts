"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { randomBytes } from "crypto";
import { hashPassword, requireUser, validerEmail } from "./auth";
import { envoyerLienAcces } from "./mot-de-passe";
import { ecrireAudit, notifier } from "./lot2";
import { DROITS_DELEGABLES } from "./droits";

const CGV = `Conditions générales AVI — version 2026.1

La plateforme met à disposition un espace unique pour ouvrir et suivre des dossiers indépendants (AVI, assurance, hébergement, vol). Chaque dossier a sa référence, ses pièces et son paiement.

Le candidat reste titulaire du compte. Une délégation n’autorise jamais la signature, la modification d’identité ou la suppression du compte. Elle est révocable à tout moment.

Les tarifs acceptés à l’ouverture d’un dossier ne sont pas recalculés si le barème change ensuite.`;

const CONF = `Politique de confidentialité — version 2026.1

Nous conservons l’identité, les pièces et l’historique nécessaires au traitement du dossier. Les journaux d’audit et les acceptations de documents contractuels sont conservés pour preuve.

Les notifications in-app sont activées par défaut. Un tiers délégué ne reçoit des alertes que s’il dispose du droit « recevoir les notifications ».`;

export async function assurerDocumentsContractuels() {
  const docs = [
    { type: "cgv", numeroVersion: "2026.1", contenu: CGV },
    { type: "confidentialite", numeroVersion: "2026.1", contenu: CONF },
  ];
  for (const doc of docs) {
    await prisma.documentContractuel.upsert({
      where: { type_numeroVersion: { type: doc.type, numeroVersion: doc.numeroVersion } },
      update: { contenu: doc.contenu, actif: true },
      create: doc,
    });
  }
}

export async function documentsActifs() {
  await assurerDocumentsContractuels();
  return prisma.documentContractuel.findMany({
    where: { actif: true },
    orderBy: { type: "asc" },
  });
}

function ipDepuis(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
}

export async function enregistrerAcceptations(userId: string, idDemande?: string) {
  const docs = await documentsActifs();
  const h = await headers();
  const ip = ipDepuis(h);
  for (const doc of docs) {
    const existant = await prisma.acceptation.findFirst({
      where: { idUtilisateur: userId, idDocumentContractuel: doc.id, idDemande: idDemande ?? null },
    });
    if (existant) continue;
    const preuve = createHash("sha256").update(`${userId}:${doc.id}:${Date.now()}`).digest("hex").slice(0, 24);
    await prisma.acceptation.create({
      data: {
        idUtilisateur: userId,
        idDocumentContractuel: doc.id,
        idDemande: idDemande,
        adresseIp: ip,
        preuve,
      },
    });
  }
}

export async function ouvrirDelegation(formData: FormData) {
  const user = await requireUser();
  if (!user || user.typeCompte !== "candidat") return { error: "Seul le titulaire du compte peut déléguer." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const dateFin = String(formData.get("dateFin") ?? "").trim() || null;
  const idDemande = String(formData.get("demandeId") ?? "").trim() || null;
  const droits = DROITS_DELEGABLES.map(([code]) => code).filter((code) => formData.get(code) === "on");
  if (!email || !nom || !prenom) return { error: "Identité du tiers incomplète." };
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };
  if (email === user.email) return { error: "Vous ne pouvez pas vous déléguer à vous-même." };
  if (droits.length === 0) return { error: "Choisissez au moins un droit." };
  if (idDemande) {
    const propre = await prisma.demande.findFirst({ where: { id: idDemande, idUtilisateur: user.id } });
    if (!propre) return { error: "Dossier introuvable." };
  }

  let mandataire = await prisma.utilisateur.findUnique({ where: { email } });
  if (!mandataire) {
    mandataire = await prisma.utilisateur.create({
      data: {
        email,
        motDePasseHash: await hashPassword(randomBytes(24).toString("hex")),
        typeCompte: "delegataire",
        role: "delegataire",
        profil: { create: { nom, prenom } },
      },
    });
    await envoyerLienAcces(mandataire.id, mandataire.email, "invitation_delegation");
  }

  const delegation = await prisma.delegation.create({
    data: {
      idMandant: user.id,
      idMandataire: mandataire.id,
      idDemande,
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin,
      droits: { create: droits.map((codeDroit) => ({ codeDroit })) },
    },
  });

  await notifier(
    mandataire.id,
    "delegation",
    "Délégation reçue",
    `${user.profil?.prenom ?? "Un candidat"} vous autorise à intervenir sur ${idDemande ? "un dossier" : "son compte"}.`,
    idDemande ?? undefined,
  );
  await ecrireAudit(user.id, "delegation_ouverte", "delegation", delegation.id, idDemande, email);
  revalidatePath("/delegations");
  return { ok: true };
}

export async function revoquerDelegation(formData: FormData) {
  const user = await requireUser();
  if (!user || user.typeCompte !== "candidat") return { error: "Droit insuffisant." };
  const id = String(formData.get("delegationId") ?? "");
  const motif = String(formData.get("motif") ?? "").trim() || "Révoquée par le titulaire";
  const delegation = await prisma.delegation.findFirst({ where: { id, idMandant: user.id } });
  if (!delegation) return { error: "Délégation introuvable." };
  await prisma.delegation.update({
    where: { id },
    data: { statut: "revoquee", motifRevocation: motif, revokedAt: new Date() },
  });
  await notifier(delegation.idMandataire, "delegation", "Délégation révoquée", "Vous n’avez plus accès aux dossiers concernés.");
  await ecrireAudit(user.id, "delegation_revoquee", "delegation", id, delegation.idDemande, motif);
  revalidatePath("/delegations");
  return { ok: true };
}
