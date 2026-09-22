import { prisma } from "./prisma";
import { requireUser, sidCourant } from "./auth";
import { ecrireAudit } from "./lot2";
import { supprimerStockage } from "./fichiers";

const DOSSIERS_OUVERTS = ["brouillon", "en_traitement"];

/** Pièces d’identité / OCR : 24 mois après clôture du dossier. */
export const RETENTION_PIECES_JOURS = 730;
/** Messages dossier : 24 mois après clôture. */
export const RETENTION_MESSAGES_JOURS = 730;

async function effacerPiecesDemande(idDemande: string) {
  const docs = await prisma.document.findMany({
    where: { idDemande, type: "transmis" },
    select: { id: true, storagePath: true },
  });
  for (const doc of docs) {
    if (doc.storagePath) await supprimerStockage(doc.storagePath);
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        nom: "[effacé RGPD]",
        storagePath: "",
        hash: "",
        ocrTexte: "",
        ocrJson: "",
        ocrStatut: "efface_rgpd",
      },
    });
  }
}

export async function anonymiserDossiersUtilisateur(userId: string) {
  const demandes = await prisma.demande.findMany({
    where: { idUtilisateur: userId },
    select: { id: true, conversation: { select: { id: true } } },
  });

  for (const d of demandes) {
    await effacerPiecesDemande(d.id);
    await prisma.reponseFormulaire.updateMany({
      where: { idDemande: d.id },
      data: { valeur: "" },
    });
    if (d.conversation) {
      await prisma.message.updateMany({
        where: { idConversation: d.conversation.id },
        data: { contenu: "[message effacé – exercice RGPD]" },
      });
    }
  }

  await prisma.notification.deleteMany({ where: { idUtilisateur: userId } });
  await prisma.evenementAuth.deleteMany({ where: { idUtilisateur: userId } });
  await prisma.acceptation.updateMany({
    where: { idUtilisateur: userId },
    data: { adresseIp: "", preuve: "[anonymisé RGPD]" },
  });
  await prisma.delegation.updateMany({
    where: { OR: [{ idMandant: userId }, { idMandataire: userId }], statut: "active" },
    data: { statut: "revoquee", revokedAt: new Date(), motifRevocation: "Clôture compte RGPD" },
  });
}

export async function exporterDonnees() {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };

  const [profil, demandes, delegations, acceptations, sessions, notifications, reclamations] =
    await Promise.all([
      prisma.profilCandidat.findUnique({ where: { idUtilisateur: user.id } }),
      prisma.demande.findMany({
        where: { idUtilisateur: user.id },
        select: {
          id: true,
          reference: true,
          statut: true,
          createdAt: true,
          updatedAt: true,
          offre: { select: { codePays: true, codeService: true } },
          documents: {
            select: { nom: true, type: true, statut: true, format: true, createdAt: true, ocrStatut: true },
          },
          reponses: { select: { valeur: true, champ: { select: { code: true, libelle: true } } } },
          conversation: {
            select: {
              messages: {
                select: { contenu: true, createdAt: true, idAuteur: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
          espaceFinancier: {
            select: {
              montantAttendu: true,
              montantRecu: true,
              statutFonds: true,
              operations: {
                select: { type: true, montant: true, reference: true, statut: true, createdAt: true, source: true },
              },
            },
          },
        },
      }),
      prisma.delegation.findMany({
        where: { OR: [{ idMandant: user.id }, { idMandataire: user.id }] },
        select: { statut: true, dateDebut: true, dateFin: true, idMandant: true, idMandataire: true },
      }),
      prisma.acceptation.findMany({
        where: { idUtilisateur: user.id },
        select: {
          dateAcceptation: true,
          idDemande: true,
          document: { select: { type: true, numeroVersion: true } },
        },
      }),
      prisma.sessionAuth.findMany({
        where: { idUtilisateur: user.id },
        select: { createdAt: true, expireAt: true, ip: true, revoqueeAt: true, userAgent: true },
      }),
      prisma.notification.findMany({
        where: { idUtilisateur: user.id },
        select: { evenement: true, titre: true, corps: true, createdAt: true, statut: true },
        take: 200,
        orderBy: { createdAt: "desc" },
      }),
      prisma.reclamation.findMany({
        where: { idAuteur: user.id },
        select: { numero: true, objet: true, categorie: true, statut: true, createdAt: true },
      }),
    ]);

  await ecrireAudit(user.id, "export_rgpd", "utilisateur", user.id, null, user.email);
  return {
    ok: true as const,
    donnees: {
      exporteLe: new Date().toISOString(),
      baseLegale: "RGPD art. 15 (accès) et art. 20 (portabilité)",
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
      notifications,
      reclamations,
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

/** Purge automatique des pièces après rétention post-clôture (minimisation). */
export async function appliquerRetentionDocuments() {
  const limite = new Date(Date.now() - RETENTION_PIECES_JOURS * 24 * 60 * 60 * 1000);
  const dossiers = await prisma.demande.findMany({
    where: {
      statut: { in: ["cloturee", "abandonnee", "annulee"] },
      updatedAt: { lt: limite },
    },
    select: { id: true, reference: true, conversation: { select: { id: true } } },
    take: 80,
  });

  let pieces = 0;
  let messages = 0;
  for (const d of dossiers) {
    const avant = await prisma.document.count({
      where: { idDemande: d.id, type: "transmis", storagePath: { not: "" } },
    });
    await effacerPiecesDemande(d.id);
    pieces += avant;

    if (d.conversation) {
      const maj = await prisma.message.updateMany({
        where: {
          idConversation: d.conversation.id,
          NOT: { contenu: { startsWith: "[message effacé" } },
          createdAt: { lt: limite },
        },
        data: { contenu: "[message effacé – rétention RGPD]" },
      });
      messages += maj.count;
    }

    await prisma.reponseFormulaire.updateMany({
      where: { idDemande: d.id },
      data: { valeur: "" },
    });
  }

  return {
    dossiers: dossiers.length,
    piecesEffacees: pieces,
    messagesAnonymises: messages,
    retentionJours: RETENTION_PIECES_JOURS,
  };
}
