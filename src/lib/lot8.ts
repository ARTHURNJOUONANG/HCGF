"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { ecrireAudit, notifier } from "./lot2";
import { aLeDroit, droitsSurDemande } from "./delegation";
import { notifierEtMailer, texteRelance } from "./courrier";
import { origine } from "./origine";
import { validerLongueur } from "./validation";

const SLAS = [
  { code: "standard", libelle: "Standard", delaiHeures: 72, supplement: 0 },
  { code: "prioritaire", libelle: "Prioritaire", delaiHeures: 24, supplement: 1900 },
  { code: "urgent", libelle: "Urgent", delaiHeures: 8, supplement: 4900 },
];

const REGLES = [
  { delaiJours: 2, typeRelance: "incomplet", creerTache: false },
  { delaiJours: 5, typeRelance: "incomplet", creerTache: false },
  { delaiJours: 7, typeRelance: "incomplet", creerTache: false },
  { delaiJours: 10, typeRelance: "incomplet", creerTache: true },
];

export async function assurerCatalogueExploitation() {
  for (const sla of SLAS) {
    await prisma.configSla.upsert({
      where: { code: sla.code },
      update: { libelle: sla.libelle, delaiHeures: sla.delaiHeures, supplement: sla.supplement },
      create: sla,
    });
  }
  const count = await prisma.regleRelance.count();
  if (count === 0) {
    for (const r of REGLES) {
      await prisma.regleRelance.create({ data: r });
    }
  }
}

export async function assurerEcheanceSla(demandeId: string) {
  await assurerCatalogueExploitation();
  const demande = await prisma.demande.findUnique({ where: { id: demandeId } });
  if (!demande) return;
  const sla = await prisma.configSla.findUnique({ where: { code: demande.slaCode || demande.priorite || "standard" } });
  const heures = sla?.delaiHeures ?? 72;
  const existante = await prisma.echeance.findFirst({
    where: { idDemande: demandeId, type: "reponse_dossier" },
  });
  const date = new Date(demande.createdAt.getTime() + heures * 3600 * 1000);
  if (existante) {
    await prisma.echeance.update({ where: { id: existante.id }, data: { dateEcheance: date } });
  } else {
    await prisma.echeance.create({
      data: { idDemande: demandeId, type: "reponse_dossier", dateEcheance: date },
    });
  }
}

export async function changerPriorite(formData: FormData) {
  const user = await requireUser();
  if (!user || user.typeCompte !== "collaborateur") return { error: "Droit insuffisant." };
  const id = String(formData.get("demandeId") ?? "");
  const priorite = String(formData.get("priorite") ?? "normal");
  const slaCode = priorite === "urgent" ? "urgent" : priorite === "prioritaire" ? "prioritaire" : "standard";
  await prisma.demande.update({ where: { id }, data: { priorite, slaCode } });
  await assurerEcheanceSla(id);
  await ecrireAudit(user.id, "priorite_sla", "demande", id, id, `${priorite}/${slaCode}`);
  revalidatePath(`/bureau/demandes/${id}`);
  revalidatePath("/bureau/exploitation");
  return { ok: true };
}

export async function traiterRelancesDues(idAssignee?: string) {
  await assurerCatalogueExploitation();
  const regles = await prisma.regleRelance.findMany({ where: { actif: true }, orderBy: { delaiJours: "asc" } });
  const dossiers = await prisma.demande.findMany({
    where: { statut: { in: ["brouillon", "en_traitement"] } },
    include: { utilisateur: { include: { profil: true } }, relances: true, checklist: true },
  });
  const maintenant = new Date();
  const base = await origine();
  let creees = 0;
  let mails = 0;
  let journal = 0;
  let echecs = 0;

  for (const demande of dossiers) {
    const incomplets = demande.checklist.some((c) => c.statut !== "termine");
    if (demande.pourcentageAvancement >= 100 && !incomplets) continue;
    const ageJours = Math.floor(
      (maintenant.getTime() - (demande.dateDerniereActivite ?? demande.createdAt).getTime()) / 86400000,
    );
    for (const regle of regles) {
      if (ageJours < regle.delaiJours) continue;
      if (demande.relances.some((r) => r.idRegle === regle.id)) continue;

      const prenom = demande.utilisateur.profil?.prenom ?? "";
      const lien = `${base}/demandes/${demande.id}`;
      const titre = `Relance J+${regle.delaiJours}`;
      const corps = `Votre dossier ${demande.reference} est encore incomplet.`;
      const texte = texteRelance({
        prenom,
        reference: demande.reference,
        delaiJours: regle.delaiJours,
        lien,
      });

      let statut = "envoyee";
      const envoi = await notifierEtMailer({
        idUtilisateur: demande.idUtilisateur,
        evenement: "relance",
        titre,
        corps,
        idDemande: demande.id,
        sujet: `${titre} — ${demande.reference}`,
        texte,
      });
      if (envoi.mode === "journal") journal += 1;
      else if (envoi.mode === "resend") mails += 1;
      else {
        statut = "echec";
        echecs += 1;
      }

      const delegues = await prisma.delegation.findMany({
        where: {
          idMandant: demande.idUtilisateur,
          statut: "active",
          OR: [{ idDemande: null }, { idDemande: demande.id }],
          droits: { some: { codeDroit: "recevoir_notif" } },
        },
      });
      for (const d of delegues) {
        await notifierEtMailer({
          idUtilisateur: d.idMandataire,
          evenement: "relance",
          titre,
          corps: `Dossier ${demande.reference} incomplet.`,
          idDemande: demande.id,
          sujet: `${titre} — ${demande.reference}`,
          texte,
        });
      }

      if (regle.creerTache) {
        const assignee =
          idAssignee ??
          (
            await prisma.utilisateur.findFirst({
              where: { typeCompte: "collaborateur", statut: "actif" },
              select: { id: true },
            })
          )?.id;
        await prisma.tacheInterne.create({
          data: {
            idDemande: demande.id,
            action: `Relancer le candidat — dossier incomplet depuis ${regle.delaiJours} jours`,
            priorite: demande.priorite,
            idAssignee: assignee,
            dateEcheance: maintenant,
          },
        });
      }

      await prisma.relance.create({
        data: {
          idDemande: demande.id,
          idRegle: regle.id,
          datePrevue: maintenant,
          dateEnvoi: statut === "echec" ? null : maintenant,
          statut,
        },
      });
      creees += 1;
    }
  }

  return { creees, mails, journal, echecs };
}

export async function traiterEcheancesDues() {
  await assurerCatalogueExploitation();
  const dues = await prisma.echeance.findMany({
    where: {
      alerteGeneree: false,
      dateEcheance: { lte: new Date() },
      demande: { statut: { in: ["brouillon", "en_traitement", "en_signature"] } },
    },
    include: { demande: { include: { utilisateur: { include: { profil: true } } } } },
    take: 40,
  });

  const conseiller = await prisma.utilisateur.findFirst({
    where: { typeCompte: "collaborateur", statut: "actif" },
    select: { id: true },
  });
  let alertes = 0;

  for (const echeance of dues) {
    const titre = `Échéance SLA dépassée · ${echeance.demande.reference}`;
    const corps = `Le délai de réponse du dossier ${echeance.demande.reference} est dépassé.`;
    if (conseiller) {
      await notifier(conseiller.id, "sla", titre, corps, echeance.idDemande);
      await prisma.tacheInterne.create({
        data: {
          idDemande: echeance.idDemande,
          action: `Relancer le dossier — échéance ${echeance.type} dépassée`,
          priorite: echeance.demande.priorite === "urgent" ? "urgent" : "haute",
          idAssignee: conseiller.id,
          dateEcheance: new Date(),
        },
      });
    }
    await notifier(echeance.demande.idUtilisateur, "sla", titre, corps, echeance.idDemande);
    await prisma.echeance.update({
      where: { id: echeance.id },
      data: { alerteGeneree: true },
    });
    alertes += 1;
  }

  return { alertes };
}

export async function executerRelances() {
  const user = await requireUser();
  if (!user || user.typeCompte !== "collaborateur") return { error: "Droit insuffisant." };
  const resultat = await traiterRelancesDues(user.id);
  await ecrireAudit(user.id, "relances_executees", "relance", "batch", null, String(resultat.creees));
  revalidatePath("/bureau/exploitation");
  return { ok: true as const, ...resultat };
}

export async function ouvrirReclamation(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const categorie = String(formData.get("categorie") ?? "autre");
  const objet = String(formData.get("objet") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!objet || !message) return { error: "Objet et message sont requis." };
  const tropLong = validerLongueur(message, 4000, "Le message");
  if (tropLong) return { error: tropLong };

  const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
  if (!aLeDroit(droits, "repondre") && !aLeDroit(droits, "consulter")) {
    return { error: "Dossier inaccessible." };
  }

  const count = await prisma.reclamation.count();
  const numero = `SAV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const reclamation = await prisma.reclamation.create({
    data: {
      numero,
      idDemande: demandeId,
      idAuteur: user.id,
      categorie,
      objet,
      messages: { create: { idAuteur: user.id, contenu: message } },
    },
  });
  const conseiller = await prisma.utilisateur.findFirst({ where: { typeCompte: "collaborateur" } });
  if (conseiller) {
    await notifier(conseiller.id, "reclamation", `Réclamation ${numero}`, objet, demandeId);
  }
  await ecrireAudit(user.id, "reclamation_ouverte", "reclamation", reclamation.id, demandeId, numero);
  revalidatePath(`/demandes/${demandeId}`);
  revalidatePath("/bureau/exploitation");
  return { ok: true };
}

export async function ecrireMessageSav(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const id = String(formData.get("reclamationId") ?? "");
  const contenu = String(formData.get("contenu") ?? "").trim();
  if (!contenu) return { error: "Message vide." };
  const tropLong = validerLongueur(contenu, 4000, "Le message");
  if (tropLong) return { error: tropLong };
  const rec = await prisma.reclamation.findUnique({ where: { id } });
  if (!rec) return { error: "Réclamation introuvable." };
  const droits = await droitsSurDemande(user.id, user.typeCompte, rec.idDemande);
  if (user.typeCompte !== "collaborateur" && !aLeDroit(droits, "repondre") && !aLeDroit(droits, "consulter")) {
    return { error: "Droit insuffisant." };
  }
  await prisma.messageSav.create({ data: { idReclamation: id, idAuteur: user.id, contenu } });
  revalidatePath("/bureau/exploitation");
  revalidatePath(`/demandes/${rec.idDemande}`);
  return { ok: true };
}

export async function changerStatutReclamation(formData: FormData) {
  const user = await requireUser();
  if (!user || user.typeCompte !== "collaborateur") return { error: "Droit insuffisant." };
  const id = String(formData.get("reclamationId") ?? "");
  const statut = String(formData.get("statut") ?? "en_cours");
  const rec = await prisma.reclamation.update({
    where: { id },
    data: { statut, idResponsable: user.id },
  });
  await notifier(rec.idAuteur, "reclamation", `Réclamation ${rec.numero}`, `Statut : ${statut}`, rec.idDemande);
  await ecrireAudit(user.id, "reclamation_statut", "reclamation", rec.id, rec.idDemande, statut);
  revalidatePath("/bureau/exploitation");
  return { ok: true };
}
