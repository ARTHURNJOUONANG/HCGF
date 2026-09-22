"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import {
  accueilPour,
  clearSession,
  createSession,
  getSession,
  hashPassword,
  limiterAction,
  requireUser,
  tenterConnexion,
  validerEmail,
  validerMotDePasse,
} from "./auth";
import { calculerAvancement, champVisible } from "./metier";
import { nouvelleReference } from "./references";
import { tronquerTexte, validerLongueur } from "./validation";
import { espaceParId, roleExigeCode } from "./espaces";
import { verifierCodeAccesRoles } from "./code-acces";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function terminerIntro(vers?: string) {
  const destination = vers === "/inscription" ? "/inscription" : "/connexion";
  const jar = await cookies();
  jar.set("avi_intro", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect(destination);
}

export async function inscrire(formData: FormData) {
  try {
    return await inscrireCompte(formData);
  } catch (error) {
    if (estRedirection(error)) throw error;
    console.error("inscription", error);
    return { error: "Impossible de créer le compte pour le moment. Réessayez dans une minute." };
  }
}

function estRedirection(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).includes("NEXT_REDIRECT")
  );
}

async function inscrireCompte(formData: FormData) {
  const quota = await limiterAction("inscription", 8);
  if ("error" in quota) return quota;

  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const nom = formString(formData, "nom");
  const prenom = formString(formData, "prenom");
  const telephone = formString(formData, "telephone");

  if (!email || !password || !nom || !prenom) {
    return { error: "Tous les champs obligatoires doivent être renseignés." };
  }
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };
  const motDePasseInvalide = validerMotDePasse(password);
  if (motDePasseInvalide) return { error: motDePasseInvalide };
  if (formData.get("acceptCgv") !== "on") {
    return { error: "L’acceptation des CGV et de la confidentialité est obligatoire." };
  }

  const exists = await prisma.utilisateur.findUnique({ where: { email } });
  if (exists) return { error: "Un compte existe déjà avec cet e-mail." };

  const espace = espaceParId(formString(formData, "role"));
  if (espace.typeCompte === "collaborateur") {
    return { error: "Un contrôleur ou un administrateur s’invite depuis le bureau." };
  }
  if (roleExigeCode(espace.id)) {
    const codeOk = await verifierCodeAccesRoles(formString(formData, "codeAcces"));
    if (!codeOk) return { error: "Code d’accès invalide." };
  }
  let idPartenaire: string | undefined;
  if (espace.typeCompte === "partenaire") {
    const organisme = formString(formData, "organisme");
    const typePartenaire = formString(formData, "typePartenaire") || "agence";
    if (!organisme) return { error: "Indiquez le nom de l’organisme." };
    const partenaire = await prisma.partenaire.create({
      data: { nom: organisme, type: typePartenaire, statut: "actif" },
    });
    await prisma.regleCommission.create({
      data: {
        idPartenaire: partenaire.id,
        taux: 0,
        montantFixe: 0,
        dateDebut: new Date().toISOString().slice(0, 10),
      },
    });
    idPartenaire = partenaire.id;
  }

  const user = await prisma.utilisateur.create({
    data: {
      email,
      motDePasseHash: await hashPassword(password),
      typeCompte: espace.typeCompte,
      role: espace.role,
      idPartenaire,
      profil: {
        create: { nom, prenom, telephone },
      },
    },
    include: { profil: true },
  });

  const { enregistrerAcceptations } = await import("./lot6");
  await enregistrerAcceptations(user.id);

  const { ecrireAudit } = await import("./lot2");
  await ecrireAudit(user.id, "inscription", "utilisateur", user.id, null, email);
  await createSession({
    id: user.id,
    email: user.email,
    nom,
    prenom,
    typeCompte: user.typeCompte,
    role: user.role,
  });
  redirect(accueilPour(user));
}

export async function connecter(identifiants: {
  email: string;
  password: string;
  role: string;
  codeAcces: string;
  acceptConfidentialite?: boolean;
}) {
  try {
    return await connecterCompte(identifiants);
  } catch (error) {
    if (estRedirection(error)) throw error;
    console.error("connexion", error);
    return { error: "Connexion indisponible pour le moment. Réessayez dans une minute." };
  }
}

async function connecterCompte(identifiants: {
  email: string;
  password: string;
  role: string;
  codeAcces: string;
  acceptConfidentialite?: boolean;
}) {
  if (!identifiants.acceptConfidentialite) {
    return { error: "Acceptez la politique de confidentialité pour continuer." };
  }

  const quota = await limiterAction("connexion", 25);
  if ("error" in quota) return quota;

  const email = identifiants.email.trim().toLowerCase();
  const password = identifiants.password;
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };
  const resultat = await tenterConnexion(email, password);
  if ("error" in resultat) return { error: resultat.error };

  if (resultat.user.typeCompte === "collaborateur") {
    const codeOk = await verifierCodeAccesRoles(identifiants.codeAcces);
    if (!codeOk) {
      return { error: "Le code d’accès n’est pas reconnu. Recopiez-le depuis le champ sous le mot de passe." };
    }
  }

  await prisma.utilisateur.update({
    where: { id: resultat.user.id },
    data: { derniereConnexion: new Date() },
  });
  const { enregistrerAcceptations } = await import("./lot6");
  await enregistrerAcceptations(resultat.user.id);
  await createSession(resultat.user);
  const { ecrireAudit } = await import("./lot2");
  await ecrireAudit(resultat.user.id, "connexion", "utilisateur", resultat.user.id, null, email);
  redirect(accueilPour(resultat.user));
}

export async function deconnecter() {
  const session = await getSession();
  await clearSession();
  if (session) {
    const { ecrireAudit } = await import("./lot2");
    await ecrireAudit(session.id, "deconnexion", "utilisateur", session.id, null, session.email);
  }
  redirect("/");
}

export async function creerDemande(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/connexion");

  const codeService = formString(formData, "service");
  const codePays = formString(formData, "pays");
  const offre = await prisma.offreService.findUnique({
    where: { codePays_codeService: { codePays, codeService } },
    include: { formulaire: { include: { champs: true } }, pieces: true },
  });
  if (!offre || !offre.actif || !offre.formulaire) {
    return { error: "Cette combinaison pays / service n'est pas encore ouverte." };
  }

  const reference = await nouvelleReference(codeService, codePays);

  const valeursPrefill: Record<string, string> = {};
  const profil = user.profil;
  for (const champ of offre.formulaire.champs) {
    if (champ.prefillDepuis === "email") valeursPrefill[champ.code] = user.email;
    if (champ.prefillDepuis === "nom") valeursPrefill[champ.code] = profil?.nom ?? "";
    if (champ.prefillDepuis === "prenom") valeursPrefill[champ.code] = profil?.prenom ?? "";
    if (champ.prefillDepuis === "dateNaissance") valeursPrefill[champ.code] = profil?.dateNaissance ?? "";
    if (champ.prefillDepuis === "telephone") valeursPrefill[champ.code] = profil?.telephone ?? "";
    if (champ.prefillDepuis === "adresse") valeursPrefill[champ.code] = profil?.adresse ?? "";
  }

  const demande = await prisma.demande.create({
    data: {
      reference,
      idUtilisateur: user.id,
      idOffre: offre.id,
      statut: "brouillon",
      etapeCourante: "formulaire",
      pourcentageAvancement: calculerAvancement(offre.formulaire.champs, valeursPrefill),
      reponses: {
        create: offre.formulaire.champs
          .filter((c) => valeursPrefill[c.code])
          .map((c) => ({
            idChamp: c.id,
            valeur: valeursPrefill[c.code],
          })),
      },
      checklist: {
        create: [
          { libelle: "Informations personnelles", statut: "en_attente", ordre: 1 },
          ...offre.pieces.map((p, i) => ({
            libelle: p.libelle,
            statut: "a_venir" as const,
            ordre: i + 2,
          })),
          { libelle: "Paiement des frais", statut: "a_venir", ordre: 20 },
          { libelle: "Validation", statut: "a_venir", ordre: 21 },
        ],
      },
    },
  });

  const { assurerEspaceFinancier } = await import("./lot3");
  await assurerEspaceFinancier(demande.id);
  const { enregistrerAcceptations } = await import("./lot6");
  await enregistrerAcceptations(user.id, demande.id);
  const { assurerEcheanceSla } = await import("./lot8");
  await assurerEcheanceSla(demande.id);

  revalidatePath("/tableau-de-bord");
  redirect(`/demandes/${demande.id}`);
}

export async function sauvegarderReponses(demandeId: string, valeurs: Record<string, string>) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };

  const { aLeDroit, droitsSurDemande } = await import("./delegation");
  const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
  if (!aLeDroit(droits, "repondre")) return { error: "Ce droit n’est pas délégué." };

  const demande = await prisma.demande.findFirst({
    where: { id: demandeId },
    include: {
      offre: { include: { formulaire: { include: { champs: true } } } },
      checklist: true,
    },
  });
  if (!demande?.offre.formulaire) return { error: "Demande introuvable." };
  if (demande.statut === "cloturee" || demande.statut === "abandonnee" || demande.statut === "annulee") {
    return { error: "Un dossier clôturé ne peut plus être modifié." };
  }

  const champs = demande.offre.formulaire.champs;
  for (const champ of champs) {
    if (!champVisible(champ, valeurs)) continue;
    const brute = valeurs[champ.code] ?? "";
    const tropLong = validerLongueur(brute, 2000, champ.libelle);
    if (tropLong) return { error: tropLong };
    const valeur = tronquerTexte(brute, 2000);
    await prisma.reponseFormulaire.upsert({
      where: { idDemande_idChamp: { idDemande: demande.id, idChamp: champ.id } },
      update: { valeur, dateSaisie: new Date() },
      create: { idDemande: demande.id, idChamp: champ.id, valeur },
    });
  }

  const avancement = calculerAvancement(champs, valeurs);
  const infoOk = avancement >= 40;
  await prisma.demande.update({
    where: { id: demande.id },
    data: {
      pourcentageAvancement: avancement,
      dateDerniereActivite: new Date(),
      etapeCourante: avancement >= 100 ? "documents" : "formulaire",
    },
  });

  const perso = demande.checklist.find((i) => i.libelle.toLowerCase().includes("information"));
  if (perso) {
    await prisma.itemChecklist.update({
      where: { id: perso.id },
      data: { statut: infoOk ? "termine" : avancement > 0 ? "en_attente" : "a_venir" },
    });
  }

  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath("/tableau-de-bord");

  try {
    const { signalerIdentiteInstable } = await import("./fraude");
    const alerte = await signalerIdentiteInstable(demande.id);
    revalidatePath("/bureau/fraude");
    return { ok: true, avancement, fraudeDetectee: Boolean(alerte) };
  } catch (erreur) {
    console.error("signalerIdentiteInstable", erreur);
  }

  return { ok: true, avancement, fraudeDetectee: false };
}
