"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  accueilPour,
  createSession,
  hashPassword,
  limiterAction,
  revoquerSessions,
  validerEmail,
  validerMotDePasse,
} from "./auth";
import { ecrireAudit } from "./lot2";
import { envoyerMail } from "./mailer";
import { origine } from "./origine";

const DUREE_MS = 60 * 60 * 1000;

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function lireJeton(token: string) {
  if (!token) return null;
  const jeton = await prisma.jetonReinitialisation.findUnique({
    where: { token },
    include: { utilisateur: { include: { profil: true } } },
  });
  if (!jeton || jeton.utiliseAt || jeton.expireAt.getTime() <= Date.now()) return null;
  return jeton;
}

export async function demanderReinitialisation(formData: FormData) {
  const quota = await limiterAction("mot_de_passe_demande", 5);
  if ("error" in quota) return quota;

  const email = formString(formData, "email").toLowerCase();
  const emailInvalide = validerEmail(email);
  if (emailInvalide) return { error: emailInvalide };

  const user = await prisma.utilisateur.findUnique({ where: { email } });

  if (user) {
    await envoyerLienAcces(user.id, user.email, "mot_de_passe_demande");
  }

  return { ok: true as const };
}

export async function envoyerLienAcces(idUtilisateur: string, email: string, action = "mot_de_passe_demande") {
  const token = randomBytes(32).toString("hex");
  await prisma.jetonReinitialisation.updateMany({
    where: { idUtilisateur, utiliseAt: null },
    data: { utiliseAt: new Date() },
  });
  await prisma.jetonReinitialisation.create({
    data: {
      token,
      idUtilisateur,
      expireAt: new Date(Date.now() + DUREE_MS),
    },
  });
  const base = await origine();
  const lien = `${base}/mot-de-passe/${token}`;
  await ecrireAudit(idUtilisateur, action, "utilisateur", idUtilisateur, null, email);
  try {
    await envoyerMail({
      to: email,
      subject: "Accéder à votre espace HCGF",
      texte: `Bonjour,\n\nPour choisir votre mot de passe, ouvrez ce lien (valable 1 heure) :\n${lien}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.\n`,
    });
  } catch (erreur) {
    console.error("envoyerLienAcces", erreur);
  }
  return lien;
}

export async function definirNouveauMotDePasse(formData: FormData) {
  const quota = await limiterAction("mot_de_passe_redefini", 8);
  if ("error" in quota) return quota;

  const token = formString(formData, "token");
  const password = formString(formData, "password");
  const confirmation = formString(formData, "confirmation");

  const motDePasseInvalide = validerMotDePasse(password);
  if (motDePasseInvalide) return { error: motDePasseInvalide };
  if (password !== confirmation) {
    return { error: "Les deux saisies ne correspondent pas." };
  }

  const jeton = await lireJeton(token);
  if (!jeton) {
    return { error: "Ce lien n’est plus valable. Demandez-en un nouveau." };
  }

  await prisma.$transaction([
    prisma.utilisateur.update({
      where: { id: jeton.idUtilisateur },
      data: {
        motDePasseHash: await hashPassword(password),
        echecsConnexion: 0,
        verrouilleJusqua: null,
      },
    }),
    prisma.jetonReinitialisation.update({
      where: { id: jeton.id },
      data: { utiliseAt: new Date() },
    }),
  ]);

  await revoquerSessions(jeton.idUtilisateur);
  await ecrireAudit(
    jeton.idUtilisateur,
    "mot_de_passe_redefini",
    "utilisateur",
    jeton.idUtilisateur,
    null,
    jeton.utilisateur.email,
  );

  await createSession({
    id: jeton.utilisateur.id,
    email: jeton.utilisateur.email,
    nom: jeton.utilisateur.profil?.nom ?? "",
    prenom: jeton.utilisateur.profil?.prenom ?? "",
    typeCompte: jeton.utilisateur.typeCompte,
    role: jeton.utilisateur.role,
  });

  redirect(accueilPour(jeton.utilisateur));
}
