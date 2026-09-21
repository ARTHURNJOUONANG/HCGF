"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { hashBuffer, extraireOcr } from "./ocr";
import { detecterFormat, ecrireStockage } from "./fichiers";
import { signalerPiecePartagee, leverAlerteFraude } from "./fraude";
import { validerLongueur } from "./validation";
import { cloreQuatreYeux, enregistrerControleQuatreYeux, exigerQuatreYeuxSignature } from "./quatre-yeux";
import { creerProcedureSignature, modeEsign } from "./esign";
import { estAdministrateur } from "./espaces";

async function acteur() {
  const user = await requireUser();
  if (!user) return null;
  return user;
}

export async function ecrireAudit(
  idActeur: string | null,
  action: string,
  objetType: string,
  objetId: string,
  idDemande: string | null,
  detail: string,
) {
  await prisma.journalAudit.create({
    data: { idActeur, action, objetType, objetId, idDemande, detail },
  });
}

export async function notifier(
  idUtilisateur: string,
  evenement: string,
  titre: string,
  corps: string,
  idDemande?: string,
) {
  await prisma.notification.create({
    data: { idUtilisateur, evenement, titre, corps, idDemande },
  });
}

function peutTraiter(user: { typeCompte: string; role: string }) {
  return user.typeCompte === "collaborateur";
}

function peutSigner(user: { role: string }) {
  return estAdministrateur(user.role);
}

async function accesDemande(userId: string, typeCompte: string, demandeId: string) {
  const include = {
    utilisateur: { include: { profil: true } },
    offre: { include: { pays: true, service: true, pieces: true } },
    checklist: true,
  };
  if (typeCompte === "collaborateur") {
    return prisma.demande.findFirst({ where: { id: demandeId }, include });
  }
  const propre = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: userId },
    include,
  });
  if (propre) return propre;
  const { droitsSurDemande } = await import("./delegation");
  const droits = await droitsSurDemande(userId, typeCompte, demandeId);
  if (!droits) return null;
  return prisma.demande.findFirst({ where: { id: demandeId }, include });
}

export async function deposerDocument(formData: FormData) {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };

  const demandeId = String(formData.get("demandeId") ?? "");
  const pieceId = String(formData.get("pieceId") ?? "");
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { error: "Choisissez un fichier PDF ou image." };
  }
  if (fichier.size > 8 * 1024 * 1024) return { error: "Fichier trop volumineux (8 Mo max)." };

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const format = detecterFormat(buffer);
  if (!format) return { error: "Formats acceptés : PDF, JPG, PNG, WebP." };

  const demande = await accesDemande(user.id, user.typeCompte, demandeId);
  if (!demande) return { error: "Dossier introuvable." };
  if (user.typeCompte === "delegataire") {
    const { aLeDroit, droitsSurDemande } = await import("./delegation");
    const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
    if (!aLeDroit(droits, "deposer_piece")) return { error: "Ce droit n’est pas délégué." };
  }

  const filename = `${demande.reference}-${pieceId}-${Date.now()}${format.ext}`;
  await ecrireStockage(filename, buffer);

  const doc = await prisma.document.create({
    data: {
      idDemande: demande.id,
      idPieceRequise: pieceId || null,
      idAuteur: user.id,
      type: "transmis",
      nom: fichier.name,
      format: format.mime,
      storagePath: filename,
      hash: hashBuffer(buffer),
      statut: "recu",
      origine: user.typeCompte === "collaborateur" ? "equipe" : "candidat",
    },
  });

  await signalerPiecePartagee({ documentId: doc.id, hash: doc.hash, idDemande: demande.id });
  await extraireOcr({
    documentId: doc.id,
    idDemande: demande.id,
    nom: fichier.name,
    format: format.mime,
    buffer,
  });

  const piece = demande.offre.pieces.find((p) => p.id === pieceId);
  const item = demande.checklist.find((c) => piece && c.libelle === piece.libelle);
  if (item) {
    await prisma.itemChecklist.update({
      where: { id: item.id },
      data: { statut: "en_attente" },
    });
  }

  await prisma.demande.update({
    where: { id: demande.id },
    data: {
      statut: demande.statut === "brouillon" ? "en_traitement" : demande.statut,
      etapeCourante: "documents",
      dateDerniereActivite: new Date(),
    },
  });

  await prisma.tacheInterne.create({
    data: {
      idDemande: demande.id,
      action: `Contrôler ${piece?.libelle ?? "une pièce"}`,
      priorite: "normal",
    },
  });

  await ecrireAudit(user.id, "depot_document", "document", doc.id, demande.id, fichier.name);
  await notifier(
    demande.idUtilisateur,
    "document_recu",
    "Document reçu",
    `${piece?.libelle ?? "Une pièce"} a été déposé sur ${demande.reference}.`,
    demande.id,
  );

  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath(`/bureau/demandes/${demande.id}`);
  revalidatePath("/bureau");
  return { ok: true };
}

export async function controlerDocument(formData: FormData) {
  const user = await acteur();
  if (!user || !peutTraiter(user)) return { error: "Droit insuffisant." };

  const documentId = String(formData.get("documentId") ?? "");
  const statut = String(formData.get("statut") ?? "");
  if (!["conforme", "a_verifier", "a_remplacer"].includes(statut)) {
    return { error: "Statut de contrôle invalide." };
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { piece: true, demande: true },
  });
  if (!doc) return { error: "Document introuvable." };

  await prisma.document.update({ where: { id: doc.id }, data: { statut } });
  if (statut === "conforme") {
    await enregistrerControleQuatreYeux({ idDemande: doc.idDemande, idVerificateur: user.id });
  }

  if (doc.piece) {
    const item = await prisma.itemChecklist.findFirst({
      where: { idDemande: doc.idDemande, libelle: doc.piece.libelle },
    });
    if (item) {
      await prisma.itemChecklist.update({
        where: { id: item.id },
        data: {
          statut:
            statut === "conforme" ? "termine" : statut === "a_remplacer" ? "en_attente" : "en_attente",
        },
      });
    }
  }

  const libelle = doc.piece?.libelle ?? doc.nom;
  await ecrireAudit(user.id, "controle_document", "document", doc.id, doc.idDemande, statut);
  await notifier(
    doc.demande.idUtilisateur,
    statut === "conforme" ? "document_accepte" : "document_refuse",
    statut === "conforme" ? "Document accepté" : "Document à revoir",
    `${libelle} : ${statut === "conforme" ? "conforme" : statut === "a_remplacer" ? "à remplacer" : "contrôle humain requis"}.`,
    doc.idDemande,
  );

  revalidatePath(`/demandes/${doc.idDemande}`);
  revalidatePath(`/bureau/demandes/${doc.idDemande}`);
  return { ok: true };
}

export async function envoyerMessage(formData: FormData) {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };

  const demandeId = String(formData.get("demandeId") ?? "");
  const contenu = String(formData.get("contenu") ?? "").trim();
  if (!contenu) return { error: "Le message est vide." };
  const tropLong = validerLongueur(contenu, 4000, "Le message");
  if (tropLong) return { error: tropLong };

  const demande = await accesDemande(user.id, user.typeCompte, demandeId);
  if (!demande) return { error: "Dossier introuvable." };
  if (user.typeCompte === "delegataire") {
    const { aLeDroit, droitsSurDemande } = await import("./delegation");
    const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
    if (!aLeDroit(droits, "repondre")) return { error: "Ce droit n’est pas délégué." };
  }

  const conversation = await prisma.conversation.upsert({
    where: { idDemande: demande.id },
    update: {},
    create: { idDemande: demande.id },
  });

  const message = await prisma.message.create({
    data: { idConversation: conversation.id, idAuteur: user.id, contenu },
  });

  const destinataireId =
    user.id === demande.idUtilisateur
      ? (
          await prisma.utilisateur.findFirst({
            where: { typeCompte: "collaborateur" },
          })
        )?.id
      : demande.idUtilisateur;

  if (destinataireId) {
    await notifier(
      destinataireId,
      "message",
      `Message sur ${demande.reference}`,
      contenu.slice(0, 140),
      demande.id,
    );
  }

  await ecrireAudit(user.id, "message", "message", message.id, demande.id, contenu.slice(0, 80));
  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath(`/bureau/demandes/${demande.id}`);
  return { ok: true };
}

export async function creerTache(formData: FormData) {
  const user = await acteur();
  if (!user || !peutTraiter(user)) return { error: "Droit insuffisant." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const action = String(formData.get("action") ?? "").trim();
  const priorite = String(formData.get("priorite") ?? "normal");
  if (!action) return { error: "Décrivez la tâche." };
  const tropLong = validerLongueur(action, 400, "La tâche");
  if (tropLong) return { error: tropLong };
  const demande = await prisma.demande.findUnique({ where: { id: demandeId }, select: { id: true } });
  if (!demande) return { error: "Dossier introuvable." };

  const tache = await prisma.tacheInterne.create({
    data: { idDemande: demandeId, action, priorite, idAssignee: user.id },
  });
  await ecrireAudit(user.id, "creation_tache", "tache", tache.id, demandeId, action);
  revalidatePath(`/bureau/demandes/${demandeId}`);
  revalidatePath("/bureau/taches");
  return { ok: true };
}

export async function terminerTache(formData: FormData) {
  const user = await acteur();
  if (!user || !peutTraiter(user)) return { error: "Droit insuffisant." };
  const id = String(formData.get("tacheId") ?? "");
  const tache = await prisma.tacheInterne.update({
    where: { id },
    data: { statut: "termine" },
  });
  await ecrireAudit(user.id, "cloture_tache", "tache", tache.id, tache.idDemande, tache.action);
  revalidatePath("/bureau/taches");
  revalidatePath(`/bureau/demandes/${tache.idDemande}`);
  return { ok: true };
}

export async function signerEtValider(formData: FormData) {
  const user = await acteur();
  if (!user || !peutSigner(user)) {
    return { error: "Seul un administrateur habilité peut signer une attestation." };
  }

  const demandeId = String(formData.get("demandeId") ?? "");
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: {
      utilisateur: { include: { profil: true } },
      offre: { include: { pays: true, service: true, pieces: true } },
      documents: { include: { piece: true } },
      reponses: { include: { champ: true } },
    },
  });
  if (!demande) return { error: "Dossier introuvable." };
  if (demande.controleRenforce) {
    return { error: "Une alerte fraude est ouverte. Levez-la avant de signer." };
  }

  const manquantes = demande.offre.pieces.filter((piece) => {
    if (!piece.obligatoire) return false;
    return !demande.documents.some(
      (d) => d.idPieceRequise === piece.id && d.statut === "conforme",
    );
  });
  if (manquantes.length > 0) {
    return { error: `Pièces non conformes : ${manquantes.map((p) => p.libelle).join(", ")}.` };
  }

  const bloquantes = demande.documents.filter((d) => d.statut === "a_remplacer" && d.type === "transmis");
  if (bloquantes.length > 0) {
    return { error: "Un document à remplacer bloque la signature." };
  }

  const quatreYeux = await exigerQuatreYeuxSignature(demande.id, user.id);
  if ("error" in quatreYeux) return quatreYeux;

  const finance = await prisma.espaceFinancier.findUnique({ where: { idDemande: demande.id } });
  if (finance && finance.statutFonds !== "fonds_recus") {
    return { error: "La signature attend que les fonds soient reçus." };
  }

  const lignes = demande.reponses
    .map((r) => `<tr><th>${r.champ.libelle}</th><td>${r.valeur || "—"}</td></tr>`)
    .join("");
  const annexes = demande.documents
    .filter((d) => d.type === "transmis")
    .map((d, i) => `<li>${i + 2}. ${d.piece?.libelle ?? d.nom} — ${d.statut}</li>`)
    .join("");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${demande.reference}</title>
  <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#152238}
  h1{font-weight:400} table{width:100%;border-collapse:collapse} th,td{border-top:1px solid #ddd4c6;padding:8px;text-align:left}
  .meta{color:#6a6258;font-size:13px}</style></head><body>
  <p>AVI — Document officiel</p>
  <h1>${demande.offre.service.libelle} · ${demande.offre.pays.libelle}</h1>
  <p class="meta">${demande.reference} · Signé le ${new Date().toLocaleString("fr-FR")} par ${user.profil?.prenom ?? ""} ${user.profil?.nom || user.email}</p>
  <p>Candidat : ${demande.utilisateur.profil?.prenom ?? ""} ${demande.utilisateur.profil?.nom ?? demande.utilisateur.email}</p>
  <table>${lignes}</table>
  <h2>Pièces fusionnées</h2>
  <ol><li>1. Formulaire signé</li>${annexes}</ol>
  <p class="meta">Formulaire en première partie. Version verrouillée. Toute régénération créera une nouvelle version.</p>
  </body></html>`;

  const filename = `${demande.reference}-final-${Date.now()}.html`;
  await ecrireStockage(filename, html);

  const doc = await prisma.document.create({
    data: {
      idDemande: demande.id,
      idAuteur: user.id,
      type: "genere",
      nom: `Dossier final ${demande.reference}`,
      format: "text/html",
      storagePath: filename,
      hash: hashBuffer(html),
      statut: modeEsign() === "yousign" ? "en_signature" : "signe",
      origine: "systeme",
    },
  });

  const procedure = await creerProcedureSignature({
    demandeId: demande.id,
    reference: demande.reference,
    documentNom: doc.nom,
    emailSignataire: user.email,
  });
  if (!procedure.ok) return { error: procedure.error };

  if (procedure.data.pending) {
    await prisma.demande.update({
      where: { id: demande.id },
      data: { statut: "en_signature", etapeCourante: "signature", dateDerniereActivite: new Date() },
    });
    await ecrireAudit(user.id, "esign_envoyee", "document", doc.id, demande.id, procedure.data.idExterne);
    revalidatePath(`/demandes/${demande.id}`);
    revalidatePath(`/bureau/demandes/${demande.id}`);
    return { ok: true, pending: true };
  }

  await cloreQuatreYeux(quatreYeux.validation.id, user.id);
  await finaliserDossierSigne({
    demandeId: demande.id,
    documentId: doc.id,
    idSignataire: user.id,
    idCandidat: demande.idUtilisateur,
    reference: demande.reference,
  });
  return { ok: true };
}

export async function confirmerSignatureEsign(demandeId: string) {
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: { documents: true, validations: { where: { typeOperation: "signature", statut: "verifie" } } },
  });
  if (!demande) return { error: "Dossier introuvable." };
  const doc = demande.documents.find((d) => d.type === "genere" && d.statut === "en_signature");
  if (!doc) return { ok: true, deja: true };
  const dv = demande.validations[0];
  if (dv && doc.idAuteur && dv.idVerificateur !== doc.idAuteur) {
    await cloreQuatreYeux(dv.id, doc.idAuteur);
  }
  await finaliserDossierSigne({
    demandeId: demande.id,
    documentId: doc.id,
    idSignataire: doc.idAuteur ?? demande.idUtilisateur,
    idCandidat: demande.idUtilisateur,
    reference: demande.reference,
  });
  return { ok: true };
}

async function finaliserDossierSigne(opts: {
  demandeId: string;
  documentId: string;
  idSignataire: string;
  idCandidat: string;
  reference: string;
}) {
  await prisma.document.update({
    where: { id: opts.documentId },
    data: { statut: "signe" },
  });
  await prisma.signature.create({
    data: { idDocument: opts.documentId, idSignataire: opts.idSignataire },
  });
  await prisma.jetonVerification.updateMany({
    where: { idDemande: opts.demandeId, statut: "valide" },
    data: { statut: "revoque" },
  });
  await prisma.jetonVerification.create({
    data: { token: randomBytes(24).toString("hex"), idDemande: opts.demandeId, idDocument: opts.documentId },
  });
  await prisma.demande.update({
    where: { id: opts.demandeId },
    data: { statut: "validee", etapeCourante: "validation", pourcentageAvancement: 100 },
  });
  const { acquerirCommission } = await import("./lot5");
  await acquerirCommission(opts.demandeId);
  await ecrireAudit(opts.idSignataire, "signature", "document", opts.documentId, opts.demandeId, "SIGNER ET VALIDER");
  await notifier(
    opts.idCandidat,
    "attestation_disponible",
    "Attestation disponible",
    `Le dossier ${opts.reference} a été signé. Le document final est dans votre espace.`,
    opts.demandeId,
  );
  revalidatePath(`/demandes/${opts.demandeId}`);
  revalidatePath(`/bureau/demandes/${opts.demandeId}`);
  revalidatePath("/tableau-de-bord");
}

export async function marquerNotificationsLues() {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };
  await prisma.notification.updateMany({
    where: { idUtilisateur: user.id, statut: "non_lue" },
    data: { statut: "lue" },
  });
  revalidatePath("/notifications");
  return { ok: true };
}

export async function leverAlerteFraudeAction(formData: FormData) {
  const user = await acteur();
  if (!user || !peutTraiter(user)) return { error: "Droit insuffisant." };
  const alerteId = String(formData.get("alerteId") ?? "");
  if (!alerteId) return { error: "Alerte introuvable." };
  const alerte = await leverAlerteFraude(alerteId, user.id);
  revalidatePath(`/bureau/demandes/${alerte.idDemande}`);
  revalidatePath("/bureau/exploitation");
  return { ok: true as const };
}

const STATUTS_FERMABLES = new Set(["brouillon", "en_traitement"]);

export async function abandonnerDemande(formData: FormData) {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };
  if (user.typeCompte !== "candidat") return { error: "Seul le titulaire peut abandonner le dossier." };

  const demandeId = String(formData.get("demandeId") ?? "");
  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: user.id },
    include: { espaceFinancier: true },
  });
  if (!demande) return { error: "Dossier introuvable." };
  if (!STATUTS_FERMABLES.has(demande.statut)) {
    return { error: "Ce dossier ne peut plus être abandonné." };
  }
  if (demande.espaceFinancier && demande.espaceFinancier.montantRecu > 0) {
    return { error: "Demandez d’abord le remboursement des fonds reçus." };
  }

  await prisma.demande.update({
    where: { id: demande.id },
    data: { statut: "abandonnee", etapeCourante: "cloture", dateDerniereActivite: new Date() },
  });
  await ecrireAudit(user.id, "dossier_abandonne", "demande", demande.id, demande.id, demande.reference);
  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath("/tableau-de-bord");
  return { ok: true as const };
}

export async function cloturerDemande(formData: FormData) {
  const user = await acteur();
  if (!user || !peutTraiter(user)) return { error: "Droit insuffisant." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: { espaceFinancier: true },
  });
  if (!demande) return { error: "Dossier introuvable." };
  if (demande.statut !== "validee" && demande.statut !== "abandonnee") {
    return { error: "Clôturez seulement un dossier validé ou abandonné." };
  }
  await prisma.demande.update({
    where: { id: demande.id },
    data: { statut: "cloturee", dateDerniereActivite: new Date() },
  });
  await ecrireAudit(user.id, "dossier_cloture", "demande", demande.id, demande.id, demande.reference);
  revalidatePath(`/bureau/demandes/${demande.id}`);
  revalidatePath("/bureau");
  return { ok: true as const };
}
