"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { randomBytes } from "crypto";
import { hashPassword, requireUser, validerEmail } from "./auth";
import { envoyerLienAcces } from "./mot-de-passe";
import { calculerAvancement } from "./metier";
import { nouvelleReference } from "./references";
import { ecrireAudit } from "./lot2";
import { notifierEtMailer, texteCompleterDossier } from "./courrier";
import { origine } from "./origine";

function montantCommission(regle: { taux: number; montantFixe: number }, base: number) {
  if (regle.montantFixe > 0) return regle.montantFixe;
  return Math.round((base * regle.taux) / 100);
}

export async function initierDossierPartenaire(formData: FormData) {
  const user = await requireUser();
  if (!user || user.typeCompte !== "partenaire" || !user.idPartenaire) {
    return { error: "Espace partenaire uniquement." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const codeService = String(formData.get("service") ?? "AVI");
  const codePays = String(formData.get("pays") ?? "FR");
  if (!email || !nom || !prenom) return { error: "Identité du candidat incomplète." };
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };

  const offre = await prisma.offreService.findUnique({
    where: { codePays_codeService: { codePays, codeService } },
    include: { formulaire: { include: { champs: true } }, pieces: true, baremes: { where: { actif: true } } },
  });
  if (!offre?.formulaire) return { error: "Cette offre n’est pas ouverte." };

  let candidat = await prisma.utilisateur.findUnique({
    where: { email },
    include: { profil: true },
  });
  if (!candidat) {
    candidat = await prisma.utilisateur.create({
      data: {
        email,
        motDePasseHash: await hashPassword(randomBytes(24).toString("hex")),
        profil: { create: { nom, prenom } },
      },
      include: { profil: true },
    });
    await envoyerLienAcces(candidat.id, candidat.email, "invitation_candidat");
  }

  const valeurs: Record<string, string> = {};
  for (const champ of offre.formulaire.champs) {
    if (champ.prefillDepuis === "email") valeurs[champ.code] = email;
    if (champ.prefillDepuis === "nom") valeurs[champ.code] = candidat.profil?.nom || nom;
    if (champ.prefillDepuis === "prenom") valeurs[champ.code] = candidat.profil?.prenom || prenom;
  }

  const reference = await nouvelleReference(codeService, codePays);

  const demande = await prisma.demande.create({
    data: {
      reference,
      idUtilisateur: candidat.id,
      idOffre: offre.id,
      idPartenaire: user.idPartenaire,
      pourcentageAvancement: calculerAvancement(offre.formulaire.champs, valeurs),
      reponses: {
        create: offre.formulaire.champs
          .filter((c) => valeurs[c.code])
          .map((c) => ({ idChamp: c.id, valeur: valeurs[c.code] })),
      },
      checklist: {
        create: [
          { libelle: "Informations personnelles", statut: "en_attente", ordre: 1 },
          ...offre.pieces.map((p, i) => ({ libelle: p.libelle, statut: "a_venir" as const, ordre: i + 2 })),
          { libelle: "Paiement des frais", statut: "a_venir", ordre: 20 },
          { libelle: "Validation", statut: "a_venir", ordre: 21 },
        ],
      },
    },
  });

  const { assurerEspaceFinancier } = await import("./lot3");
  const espace = await assurerEspaceFinancier(demande.id);
  const regle = await prisma.regleCommission.findFirst({
    where: { idPartenaire: user.idPartenaire, actif: true },
    orderBy: { dateDebut: "desc" },
  });
  if (regle) {
    await prisma.commission.create({
      data: {
        idDemande: demande.id,
        idRegleCommission: regle.id,
        montantCalcule: montantCommission(regle, espace?.montantAttendu ?? 0),
        statut: "calculee",
      },
    });
  }

  const apporteur = [user.profil?.prenom, user.profil?.nom].filter(Boolean).join(" ") || "Votre conseiller";
  const lien = `${await origine()}/demandes/${demande.id}`;
  await notifierEtMailer({
    idUtilisateur: candidat.id,
    evenement: "dossier_cree",
    titre: "COMPLÉTER MON DOSSIER",
    corps: `${apporteur} a ouvert ${reference}. Connectez-vous pour le compléter.`,
    idDemande: demande.id,
    sujet: `Compléter mon dossier ${reference}`,
    texte: texteCompleterDossier({
      prenom: candidat.profil?.prenom || prenom,
      apporteur,
      reference,
      lien,
    }),
  });
  await ecrireAudit(user.id, "apport_partenaire", "demande", demande.id, demande.id, user.idPartenaire);
  revalidatePath("/partenaire");
  redirect(`/partenaire/demandes/${demande.id}`);
}

export async function acquerirCommission(idDemande: string) {
  const commission = await prisma.commission.findUnique({ where: { idDemande } });
  if (!commission || commission.statut !== "calculee") return;
  await prisma.commission.update({ where: { id: commission.id }, data: { statut: "acquise" } });
}

export async function payerCommission(formData: FormData) {
  const user = await requireUser();
  if (!user || user.typeCompte !== "collaborateur") return { error: "Droit insuffisant." };
  const id = String(formData.get("commissionId") ?? "");
  const commission = await prisma.commission.findUnique({ where: { id } });
  if (!commission || commission.statut !== "acquise") return { error: "La commission n’est pas encore acquise." };
  await prisma.commission.update({
    where: { id },
    data: { statut: "payee", datePaiement: new Date() },
  });
  await ecrireAudit(user.id, "commission_payee", "commission", id, commission.idDemande, String(commission.montantCalcule));
  revalidatePath("/bureau/partenaires");
  return { ok: true };
}
