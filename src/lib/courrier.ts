import { prisma } from "./prisma";
import { notifier } from "./lot2";
import { envoyerMail, type MailResult } from "./mailer";

export type CourrierResultat = MailResult | { mode: "echec" };

export async function notifierEtMailer(opts: {
  idUtilisateur: string;
  evenement: string;
  titre: string;
  corps: string;
  idDemande?: string;
  sujet: string;
  texte: string;
}): Promise<CourrierResultat> {
  await notifier(opts.idUtilisateur, opts.evenement, opts.titre, opts.corps, opts.idDemande);
  const dest = await prisma.utilisateur.findUnique({
    where: { id: opts.idUtilisateur },
    select: { email: true, statut: true },
  });
  if (!dest?.email || dest.statut !== "actif") {
    return { mode: "journal" };
  }
  try {
    return await envoyerMail({ to: dest.email, subject: opts.sujet, texte: opts.texte });
  } catch (erreur) {
    console.error("[mailer]", erreur);
    return { mode: "echec" };
  }
}

export function texteRelance(opts: {
  prenom: string;
  reference: string;
  delaiJours: number;
  lien: string;
}) {
  const ton =
    opts.delaiJours >= 10
      ? "Un conseiller va maintenant suivre ce dossier avec vous."
      : opts.delaiJours >= 7
        ? "Sans suite de votre part, l’équipe prendra le relais."
        : opts.delaiJours >= 5
          ? "Il manque encore des éléments pour avancer."
          : "Quelques informations ou pièces manquent encore.";

  return `Bonjour ${opts.prenom || "bonjour"},

Votre dossier ${opts.reference} est encore incomplet (rappel J+${opts.delaiJours}).
${ton}

Ouvrez votre espace pour le reprendre :
${opts.lien}

HCGF — Horizon Caution & Garantie Financière
`;
}

export function texteCompleterDossier(opts: {
  prenom: string;
  apporteur: string;
  reference: string;
  lien: string;
}) {
  return `Bonjour ${opts.prenom || "bonjour"},

${opts.apporteur} a ouvert le dossier ${opts.reference} pour vous.
Connectez-vous pour le compléter — pièces, formulaire et paiement restent dans ce dossier.

Compléter mon dossier :
${opts.lien}

Si vous n’avez pas encore de mot de passe, utilisez « Mot de passe oublié » sur la page de connexion.

HCGF — Horizon Caution & Garantie Financière
`;
}
