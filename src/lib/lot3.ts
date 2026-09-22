"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { ecrireAudit, notifier } from "./lot2";
import { IBAN_PLATEFORME, euros, libelleRemboursement } from "./finance";
import {
  LIBELLES_MOYEN,
  clePaiementMoyen,
  estMoyenInstant,
  modeMoyen,
  ouvrirPaiement,
} from "./moyens-paiement";
import { ecrireStockage } from "./fichiers";
import { validerIban } from "./validation";
import { estAdministrateur } from "./espaces";

const IBAN_AVI = IBAN_PLATEFORME;

const TARIFS_DEFAUT: Record<string, { montant: number; frais: number }> = {
  AVI: { montant: 14900, frais: 900 },
  ASSURANCE: { montant: 8900, frais: 900 },
  HEBERGEMENT: { montant: 7900, frais: 900 },
  VOL: { montant: 3900, frais: 900 },
};

async function acteur() {
  return requireUser();
}

function estEquipe(user: { typeCompte: string }) {
  return user.typeCompte === "collaborateur";
}

export async function assurerEspaceFinancier(demandeId: string) {
  const existant = await prisma.espaceFinancier.findUnique({
    where: { idDemande: demandeId },
    include: {
      operations: { orderBy: { createdAt: "desc" } },
      demande: {
        include: {
          tarif: true,
          piecesComptables: { orderBy: { dateEmission: "desc" } },
          remboursements: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (existant) return existant;

  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: { offre: { include: { baremes: { where: { actif: true }, orderBy: { dateEffet: "desc" } } } } },
  });
  if (!demande) return null;

  let bareme = demande.offre.baremes[0];
  if (!bareme) {
    const defaut = TARIFS_DEFAUT[demande.offre.codeService] ?? { montant: 9900, frais: 900 };
    bareme = await prisma.baremeTarifaire.create({
      data: {
        idOffre: demande.idOffre,
        version: "2026.1",
        montant: defaut.montant,
        frais: defaut.frais,
      },
    });
  }

  await prisma.tarifApplique.create({
    data: {
      idDemande: demande.id,
      idBareme: bareme.id,
      montantAccepte: bareme.montant,
      frais: bareme.frais,
      versionBareme: bareme.version,
    },
  });

  await prisma.espaceFinancier.create({
    data: {
      idDemande: demande.id,
      montantAttendu: bareme.montant + bareme.frais,
      frais: bareme.frais,
    },
  });

  return prisma.espaceFinancier.findUnique({
    where: { idDemande: demandeId },
    include: {
      operations: { orderBy: { createdAt: "desc" } },
      demande: {
        include: {
          tarif: true,
          piecesComptables: { orderBy: { dateEmission: "desc" } },
          remboursements: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
}

async function marquerChecklistPaiement(demandeId: string, statut: "a_venir" | "en_attente" | "termine") {
  const item = await prisma.itemChecklist.findFirst({
    where: { idDemande: demandeId, libelle: { contains: "Paiement" } },
  });
  if (item) {
    await prisma.itemChecklist.update({ where: { id: item.id }, data: { statut } });
  }
}

async function emettreRecu(opts: {
  demandeId: string;
  reference: string;
  service: string;
  pays: string;
  candidat: string;
  montant: number;
  moyen: string;
  transaction: string;
}) {
  const count = await prisma.pieceComptable.count();
  const numero = `RECU-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${numero}</title>
  <style>body{font-family:Inter,Segoe UI,sans-serif;max-width:640px;margin:48px auto;color:#0d2b4a}
  h1{font-weight:600;letter-spacing:-.03em} .meta{color:#5b7391;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:24px} th,td{padding:10px 0;border-top:1px solid #d7e4f7;text-align:left}
  .ok{color:#0f7a4a}</style></head><body>
  <p>AVI — Pièce comptable</p>
  <h1>Reçu ${numero}</h1>
  <p class="meta">${opts.reference} · ${opts.service} · ${opts.pays}</p>
  <p>Payé par ${opts.candidat}</p>
  <table>
    <tr><th>Montant</th><td>${euros(opts.montant)}</td></tr>
    <tr><th>Moyen</th><td>${opts.moyen}</td></tr>
    <tr><th>Transaction</th><td>${opts.transaction}</td></tr>
    <tr><th>Date</th><td>${new Date().toLocaleString("fr-FR")}</td></tr>
    <tr><th>Statut</th><td class="ok">Encaissé</td></tr>
  </table>
  <p class="meta">Ce reçu est lié uniquement à ce dossier. Un changement de barème ne le modifie pas.</p>
  </body></html>`;

  const filename = `${opts.reference}-${numero}.html`;
  await ecrireStockage(filename, html);

  return prisma.pieceComptable.create({
    data: {
      idDemande: opts.demandeId,
      numero,
      type: "recu",
      montant: opts.montant,
      storagePath: filename,
      nom: `Reçu ${numero}`,
    },
  });
}

async function enregistrerEncaissement(opts: {
  demandeId: string;
  userId: string;
  type: "paiement" | "virement";
  source: string;
  montant: number;
  reference: string;
  transaction: string;
  iban?: string;
  moyen: string;
  cleIdempotence?: string;
}) {
  const espace = await assurerEspaceFinancier(opts.demandeId);
  if (!espace) return { error: "Espace financier introuvable." };
  if (espace.statutFonds === "fonds_recus") {
    return { ok: true as const, statutFonds: espace.statutFonds, deja: true as const };
  }

  if (opts.cleIdempotence) {
    const deja = await prisma.operationFinanciere.findUnique({
      where: { cleIdempotence: opts.cleIdempotence },
    });
    if (deja?.statut === "reussi") {
      return { ok: true as const, statutFonds: espace.statutFonds, deja: true as const };
    }
    if (deja && deja.statut !== "reussi") {
      const recu = espace.montantRecu + opts.montant;
      const statutFonds = recu >= espace.montantAttendu ? "fonds_recus" : "partiel";
      await prisma.operationFinanciere.update({
        where: { id: deja.id },
        data: {
          statut: "reussi",
          idTransaction: opts.transaction,
          source: opts.source,
          montant: opts.montant,
        },
      });
      await prisma.espaceFinancier.update({
        where: { idDemande: opts.demandeId },
        data: { montantRecu: recu, statutFonds },
      });
      return finaliserEncaissement({ ...opts, statutFonds });
    }
  }

  const recu = espace.montantRecu + opts.montant;
  const statutFonds = recu >= espace.montantAttendu ? "fonds_recus" : "partiel";

  try {
    await prisma.operationFinanciere.create({
      data: {
        idEspace: espace.idDemande,
        type: opts.type,
        montant: opts.montant,
        reference: opts.reference,
        idTransaction: opts.transaction,
        cleIdempotence: opts.cleIdempotence,
        iban: opts.iban ?? "",
        source: opts.source,
        statut: "reussi",
      },
    });
  } catch {
    if (opts.cleIdempotence) {
      return { ok: true as const, statutFonds: espace.statutFonds, deja: true as const };
    }
    throw new Error("Opération financière déjà enregistrée.");
  }

  await prisma.espaceFinancier.update({
    where: { idDemande: opts.demandeId },
    data: { montantRecu: recu, statutFonds },
  });

  return finaliserEncaissement({ ...opts, statutFonds });
}

async function finaliserEncaissement(opts: {
  demandeId: string;
  userId: string;
  montant: number;
  moyen: string;
  transaction: string;
  statutFonds: string;
}) {
  const demande = await prisma.demande.findUnique({
    where: { id: opts.demandeId },
    include: {
      utilisateur: { include: { profil: true } },
      offre: { include: { pays: true, service: true } },
    },
  });
  if (!demande) return { error: "Dossier introuvable." };

  await emettreRecu({
    demandeId: demande.id,
    reference: demande.reference,
    service: demande.offre.service.libelle,
    pays: demande.offre.pays.libelle,
    candidat: `${demande.utilisateur.profil?.prenom ?? ""} ${demande.utilisateur.profil?.nom ?? demande.utilisateur.email}`.trim(),
    montant: opts.montant,
    moyen: opts.moyen,
    transaction: opts.transaction,
  });

  await marquerChecklistPaiement(demande.id, opts.statutFonds === "fonds_recus" ? "termine" : "en_attente");
  await prisma.demande.update({
    where: { id: demande.id },
    data: {
      etapeCourante: opts.statutFonds === "fonds_recus" ? "validation" : "paiement",
      dateDerniereActivite: new Date(),
    },
  });

  await ecrireAudit(opts.userId, "paiement", "operation", demande.id, demande.id, `${opts.moyen} ${euros(opts.montant)}`);
  await notifier(
    demande.idUtilisateur,
    "paiement",
    opts.statutFonds === "fonds_recus" ? "Paiement reçu" : "Paiement partiel",
    `${euros(opts.montant)} encaissés sur ${demande.reference}.`,
    demande.id,
  );

  try {
    const { signalerPaiementIncoherent } = await import("./fraude");
    await signalerPaiementIncoherent({
      idDemande: demande.id,
      idTransaction: opts.transaction,
    });
  } catch (erreur) {
    console.error("signalerPaiementIncoherent", erreur);
  }

  return { ok: true as const, statutFonds: opts.statutFonds };
}

export async function payerParMoyen(formData: FormData) {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };

  const demandeId = String(formData.get("demandeId") ?? "");
  const moyen = String(formData.get("moyen") ?? "");
  if (!estMoyenInstant(moyen)) return { error: "Choisissez PayPal, Orange Money, MTN Money ou Wero." };

  const { aLeDroit, droitsSurDemande } = await import("./delegation");
  const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
  if (!aLeDroit(droits, "payer")) return { error: "Le paiement n’est pas délégué." };
  const demande = await prisma.demande.findFirst({
    where: { id: demandeId },
    include: { utilisateur: true },
  });
  if (!demande) return { error: "Dossier introuvable." };

  const espace = await assurerEspaceFinancier(demande.id);
  if (!espace) return { error: "Tarif introuvable." };
  if (espace.statutFonds === "fonds_recus") return { error: "Ce dossier est déjà soldé." };

  const telephone = String(formData.get("telephone") ?? "").replace(/\D+/g, "");
  if ((moyen === "orange_money" || moyen === "mtn_money") && telephone.length < 8) {
    return { error: "Indiquez le numéro du compte mobile money." };
  }

  const restant = espace.montantAttendu - espace.montantRecu;
  const cle = clePaiementMoyen(moyen, demande.id, restant);
  const existante = await prisma.operationFinanciere.findUnique({ where: { cleIdempotence: cle } });
  if (existante?.statut === "reussi") return { error: "Ce dossier est déjà soldé." };

  await prisma.operationFinanciere.updateMany({
    where: { idEspace: espace.idDemande, type: "virement", statut: "en_attente" },
    data: { statut: "annule" },
  });

  const sessionOp = await ouvrirPaiement({
    moyen,
    demandeId: demande.id,
    reference: demande.reference,
    montant: restant,
    email: demande.utilisateur.email,
    telephone,
    cleIdempotence: cle,
  });
  if (!sessionOp.ok) {
    return { error: sessionOp.error || "Paiement indisponible. Utilisez le virement." };
  }

  if (sessionOp.data.pending || sessionOp.data.url) {
    if (existante) {
      await prisma.operationFinanciere.update({
        where: { id: existante.id },
        data: { idTransaction: sessionOp.data.id, source: moyen, statut: "en_attente" },
      });
    } else {
      await prisma.operationFinanciere.create({
        data: {
          idEspace: espace.idDemande,
          type: "paiement",
          montant: restant,
          reference: demande.reference,
          idTransaction: sessionOp.data.id,
          cleIdempotence: cle,
          source: moyen,
          statut: "en_attente",
        },
      });
    }
    if (sessionOp.data.url) return { ok: true, url: sessionOp.data.url };
    revalidatePath(`/demandes/${demande.id}`);
    return { ok: true, pending: true };
  }

  const result = await enregistrerEncaissement({
    demandeId: demande.id,
    userId: user.id,
    type: "paiement",
    source: modeMoyen(moyen) === "demo" ? `${moyen}_demo` : moyen,
    montant: restant,
    reference: demande.reference,
    transaction: sessionOp.data.id,
    moyen: telephone ? `${LIBELLES_MOYEN[moyen]} · ${telephone.slice(-4)}` : LIBELLES_MOYEN[moyen],
    cleIdempotence: cle,
  });
  if ("error" in result) return result;

  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}

export async function payerParCarte(formData: FormData) {
  if (!formData.get("moyen")) formData.set("moyen", "paypal");
  return payerParMoyen(formData);
}

export async function confirmerPaiementExterne(opts: {
  demandeId: string;
  transaction: string;
  montant: number;
  cleIdempotence: string;
  source: string;
  moyen: string;
}) {
  const demande = await prisma.demande.findUnique({ where: { id: opts.demandeId } });
  if (!demande) return { error: "Dossier introuvable." };
  return enregistrerEncaissement({
    demandeId: opts.demandeId,
    userId: demande.idUtilisateur,
    type: "paiement",
    source: opts.source,
    montant: opts.montant,
    reference: demande.reference,
    transaction: opts.transaction,
    moyen: opts.moyen,
    cleIdempotence: opts.cleIdempotence,
  });
}

export async function declarerVirement(formData: FormData) {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };

  const demandeId = String(formData.get("demandeId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (reference.length < 4) return { error: "Indiquez la référence du virement." };

  const { aLeDroit, droitsSurDemande } = await import("./delegation");
  const droitsPaye = await droitsSurDemande(user.id, user.typeCompte, demandeId);
  if (!aLeDroit(droitsPaye, "payer")) return { error: "Le paiement n’est pas délégué." };
  const demande = await prisma.demande.findFirst({
    where: { id: demandeId },
    include: { offre: true },
  });
  if (!demande) return { error: "Dossier introuvable." };

  const espace = await assurerEspaceFinancier(demande.id);
  if (!espace) return { error: "Tarif introuvable." };
  if (espace.statutFonds === "fonds_recus") return { error: "Ce dossier est déjà soldé." };

  const deja = espace.operations.some((o) => o.type === "virement" && o.statut === "en_attente");
  if (deja) return { error: "Un virement est déjà en attente de rapprochement." };

  await prisma.operationFinanciere.create({
    data: {
      idEspace: espace.idDemande,
      type: "virement",
      montant: espace.montantAttendu - espace.montantRecu,
      reference,
      source: "saisie",
      statut: "en_attente",
      iban: IBAN_AVI,
    },
  });

  await prisma.tacheInterne.create({
    data: {
      idDemande: demande.id,
      action: `Rapprocher le virement ${reference}`,
      priorite: "haute",
    },
  });

  await marquerChecklistPaiement(demande.id, "en_attente");
  await prisma.demande.update({
    where: { id: demande.id },
    data: { etapeCourante: "paiement", dateDerniereActivite: new Date() },
  });

  await ecrireAudit(user.id, "virement_declare", "operation", demande.id, demande.id, reference);

  let fraudeDetectee = false;
  try {
    const { signalerPaiementIncoherent } = await import("./fraude");
    const alerte = await signalerPaiementIncoherent({ idDemande: demande.id, reference });
    fraudeDetectee = Boolean(alerte);
  } catch (erreur) {
    console.error("signalerPaiementIncoherent", erreur);
  }

  const conseiller = await prisma.utilisateur.findFirst({ where: { typeCompte: "collaborateur" } });
  if (conseiller) {
    await notifier(
      conseiller.id,
      "virement",
      `Virement à rapprocher · ${demande.reference}`,
      `Référence déclarée : ${reference}`,
      demande.id,
    );
  }

  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath("/bureau/finance");
  revalidatePath("/bureau/taches");
  revalidatePath("/bureau/fraude");
  return { ok: true as const, fraudeDetectee };
}

export async function rapprocherVirement(formData: FormData) {
  const user = await acteur();
  if (!user || !estEquipe(user)) return { error: "Droit insuffisant." };

  const operationId = String(formData.get("operationId") ?? "");
  const operation = await prisma.operationFinanciere.findUnique({
    where: { id: operationId },
    include: { espace: { include: { demande: { include: { offre: { include: { pays: true, service: true } }, utilisateur: { include: { profil: true } } } } } } },
  });
  if (!operation || operation.statut !== "en_attente") return { error: "Opération introuvable." };

  const espace = operation.espace;
  if (espace.statutFonds === "fonds_recus") {
    await prisma.operationFinanciere.update({
      where: { id: operation.id },
      data: { statut: "reussi" },
    });
    return { ok: true as const, deja: true as const };
  }

  const transaction = `VIR-${Date.now().toString(36).toUpperCase()}`;
  const recu = espace.montantRecu + operation.montant;
  const statutFonds = recu >= espace.montantAttendu ? "fonds_recus" : "partiel";

  await prisma.$transaction([
    prisma.operationFinanciere.update({
      where: { id: operation.id },
      data: {
        statut: "reussi",
        source: "rapprochement",
        idTransaction: transaction,
        cleIdempotence: operation.cleIdempotence ?? `virement:${operation.id}`,
      },
    }),
    prisma.espaceFinancier.update({
      where: { idDemande: operation.idEspace },
      data: { montantRecu: recu, statutFonds },
    }),
  ]);

  const result = await finaliserEncaissement({
    demandeId: operation.idEspace,
    userId: user.id,
    montant: operation.montant,
    moyen: `Virement ${operation.reference}`,
    transaction,
    statutFonds,
  });
  if (result && "error" in result) return result;

  await ecrireAudit(user.id, "virement_rapproche", "operation", operation.id, operation.idEspace, operation.reference);

  try {
    const { signalerPaiementIncoherent } = await import("./fraude");
    await signalerPaiementIncoherent({
      idDemande: operation.idEspace,
      reference: operation.reference,
      montantOperation: operation.montant,
    });
  } catch (erreur) {
    console.error("signalerPaiementIncoherent", erreur);
  }

  revalidatePath(`/demandes/${operation.idEspace}`);
  revalidatePath(`/bureau/demandes/${operation.idEspace}`);
  revalidatePath("/bureau/finance");
  revalidatePath("/bureau/fraude");
  return { ok: true };
}

export async function demanderRemboursement(formData: FormData) {
  const user = await acteur();
  if (!user) return { error: "Session expirée." };

  const demandeId = String(formData.get("demandeId") ?? "");
  const motif = String(formData.get("motif") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim();
  if (motif.length < 8) return { error: "Précisez le motif (8 caractères minimum)." };
  const ibanInvalide = validerIban(iban);
  if (ibanInvalide) return { error: ibanInvalide };

  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: user.id },
  });
  if (!demande) return { error: "Dossier introuvable." };

  const espace = await assurerEspaceFinancier(demande.id);
  if (!espace || espace.montantRecu <= 0) return { error: "Aucun encaissement à rembourser." };

  const ouvert = await prisma.demandeRemboursement.findFirst({
    where: { idDemande: demande.id, statut: { notIn: ["remboursee", "refusee"] } },
  });
  if (ouvert) return { error: "Une demande de remboursement est déjà en cours." };

  const dossier = await prisma.demandeRemboursement.create({
    data: { idDemande: demande.id, motif, coordonnees: iban, statut: "recue" },
  });

  await prisma.tacheInterne.create({
    data: { idDemande: demande.id, action: "Traiter le remboursement", priorite: "haute" },
  });

  await ecrireAudit(user.id, "remboursement_demande", "remboursement", dossier.id, demande.id, motif);
  const conseiller = await prisma.utilisateur.findFirst({ where: { typeCompte: "collaborateur" } });
  if (conseiller) {
    await notifier(conseiller.id, "remboursement", `Remboursement · ${demande.reference}`, motif, demande.id);
  }

  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath("/bureau/finance");
  return { ok: true };
}

export async function traiterRemboursement(formData: FormData) {
  const user = await acteur();
  if (!user || !estEquipe(user)) return { error: "Droit insuffisant." };

  const id = String(formData.get("remboursementId") ?? "");
  const action = String(formData.get("action") ?? "");
  const dossier = await prisma.demandeRemboursement.findUnique({
    where: { id },
    include: { demande: { include: { espaceFinancier: true } } },
  });
  if (!dossier?.demande.espaceFinancier) return { error: "Demande introuvable." };

  const suite: Record<string, string> = {
    verifier: "a_verifier",
    valider: "validee",
    payer: "remboursee",
    refuser: "refusee",
  };
  const suivant = suite[action];
  if (!suivant) return { error: "Action inconnue." };
  if (action === "payer" && !estAdministrateur(user.role)) {
    return { error: "Seul un administrateur peut marquer un remboursement comme payé." };
  }

  await prisma.demandeRemboursement.update({ where: { id }, data: { statut: suivant } });

  if (action === "payer") {
    const montant = dossier.demande.espaceFinancier.montantRecu;
    await prisma.operationFinanciere.create({
      data: {
        idEspace: dossier.idDemande,
        idRemboursement: dossier.id,
        type: "remboursement",
        montant,
        reference: dossier.id,
        source: "saisie",
        statut: "reussi",
        iban: dossier.coordonnees,
      },
    });
    await prisma.espaceFinancier.update({
      where: { idDemande: dossier.idDemande },
      data: { montantRecu: 0, statutFonds: "rembourse" },
    });
    await marquerChecklistPaiement(dossier.idDemande, "a_venir");
  }

  await ecrireAudit(user.id, "remboursement", "remboursement", dossier.id, dossier.idDemande, suivant);
  await notifier(
    dossier.demande.idUtilisateur,
    "remboursement",
    `Remboursement : ${libelleRemboursement(suivant)}`,
    `Votre demande sur le dossier a le statut « ${libelleRemboursement(suivant)} ».`,
    dossier.idDemande,
  );

  revalidatePath(`/demandes/${dossier.idDemande}`);
  revalidatePath(`/bureau/demandes/${dossier.idDemande}`);
  revalidatePath("/bureau/finance");
  return { ok: true };
}

