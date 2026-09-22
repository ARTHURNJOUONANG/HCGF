"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { clearSession, revoquerSessions, requireUser, sidCourant } from "./auth";
import { ecrireAudit } from "./lot2";
import { anonymiserDossiersUtilisateur } from "./rgpd";

const DOSSIERS_OUVERTS = ["brouillon", "en_traitement"];

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

  await anonymiserDossiersUtilisateur(user.id);

  const emailArchive = `ferme.${user.id.slice(-8)}@hcgf.invalid`;
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      email: emailArchive,
      statut: "inactif",
      profil: user.profil
        ? {
            update: {
              nom: "Compte",
              prenom: "Fermé",
              telephone: null,
              adresse: null,
              dateNaissance: null,
            },
          }
        : undefined,
    },
  });
  await revoquerSessions(user.id);
  await ecrireAudit(user.id, "compte_ferme_rgpd", "utilisateur", user.id, null, "effacement pièces + anonymisation");
  await clearSession();
  redirect("/");
}
