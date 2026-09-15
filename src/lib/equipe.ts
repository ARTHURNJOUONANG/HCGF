"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { hashPassword, requireUser, validerEmail } from "./auth";
import { envoyerLienAcces } from "./mot-de-passe";
import { ecrireAudit } from "./lot2";

function champ(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const ROLES_EQUIPE = new Set(["conseiller", "signataire"]);
const TYPES_PARTENAIRE = new Set(["agence", "ecole", "apporteur"]);

async function reserviste() {
  const user = await requireUser();
  if (!user || user.typeCompte !== "collaborateur") return null;
  return user;
}

function peutInviterEquipe(user: { role: string }) {
  return user.role === "signataire";
}

async function creerInvite(params: {
  email: string;
  nom: string;
  prenom: string;
  typeCompte: string;
  role: string;
  idPartenaire?: string;
}) {
  const existant = await prisma.utilisateur.findUnique({ where: { email: params.email } });
  if (existant) return { error: "Un compte existe déjà avec cet e-mail." } as const;

  const utilisateur = await prisma.utilisateur.create({
    data: {
      email: params.email,
      motDePasseHash: await hashPassword(randomBytes(24).toString("hex")),
      typeCompte: params.typeCompte,
      role: params.role,
      idPartenaire: params.idPartenaire,
      profil: { create: { nom: params.nom, prenom: params.prenom } },
    },
  });

  const lien = await envoyerLienAcces(utilisateur.id, utilisateur.email, "invitation_compte");
  return { utilisateur, lien };
}

export async function creerCollaborateur(formData: FormData) {
  try {
    return await inviterCollaborateur(formData);
  } catch (erreur) {
    console.error("creerCollaborateur", erreur);
    return { error: "Impossible de créer le compte pour le moment. Réessayez." };
  }
}

async function inviterCollaborateur(formData: FormData) {
  const acteur = await reserviste();
  if (!acteur) return { error: "Réservé à l’équipe." };
  if (!peutInviterEquipe(acteur)) return { error: "Seul un signataire peut inviter l’équipe." };

  const email = champ(formData, "email").toLowerCase();
  const nom = champ(formData, "nom");
  const prenom = champ(formData, "prenom");
  const role = champ(formData, "role");

  if (!email || !nom || !prenom) return { error: "Identité incomplète." };
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };
  if (!ROLES_EQUIPE.has(role)) return { error: "Choisissez conseiller ou signataire." };

  const resultat = await creerInvite({
    email,
    nom,
    prenom,
    typeCompte: "collaborateur",
    role,
  });
  if ("error" in resultat) return resultat;

  await ecrireAudit(acteur.id, "compte_equipe_cree", "utilisateur", resultat.utilisateur.id, null, `${role}:${email}`);
  revalidatePath("/bureau/equipe");
  return { ok: true as const, lien: resultat.lien };
}

export async function creerComptePartenaire(formData: FormData) {
  const acteur = await reserviste();
  if (!acteur) return { error: "Réservé à l’équipe." };

  const organisme = champ(formData, "organisme");
  const type = champ(formData, "type");
  const email = champ(formData, "email").toLowerCase();
  const nom = champ(formData, "nom");
  const prenom = champ(formData, "prenom");
  const taux = Number(champ(formData, "taux") || "0");
  const montantFixe = Math.round(Number(champ(formData, "montantFixe") || "0") * 100);

  if (!organisme || !email || !nom || !prenom) return { error: "Identité du partenaire incomplète." };
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };
  if (!TYPES_PARTENAIRE.has(type)) return { error: "Type de partenaire invalide." };
  if (!Number.isFinite(taux) || taux < 0 || taux > 100) return { error: "Le taux doit être entre 0 et 100." };
  if (!Number.isFinite(montantFixe) || montantFixe < 0) return { error: "Le montant fixe est invalide." };

  const existant = await prisma.utilisateur.findUnique({ where: { email } });
  if (existant) return { error: "Un compte existe déjà avec cet e-mail." };

  const partenaire = await prisma.partenaire.create({
    data: { nom: organisme, type, statut: "actif" },
  });
  await prisma.regleCommission.create({
    data: {
      idPartenaire: partenaire.id,
      taux: Math.round(taux),
      montantFixe,
      dateDebut: new Date().toISOString().slice(0, 10),
    },
  });

  const resultat = await creerInvite({
    email,
    nom,
    prenom,
    typeCompte: "partenaire",
    role: "apporteur",
    idPartenaire: partenaire.id,
  });
  if ("error" in resultat) {
    await prisma.partenaire.delete({ where: { id: partenaire.id } });
    return resultat;
  }

  await ecrireAudit(
    acteur.id,
    "compte_partenaire_cree",
    "partenaire",
    partenaire.id,
    null,
    `${organisme}:${email}`,
  );
  revalidatePath("/bureau/partenaires");
  return { ok: true as const, lien: resultat.lien };
}
