import { prisma } from "./prisma";

export const TYPES_SIGNAL = {
  document_partage: "Pièce partagée",
  identite_instable: "Identité instable",
  paiement_incoherent: "Paiement incohérent",
} as const;

export type TypeSignalFraude = keyof typeof TYPES_SIGNAL;
export type NiveauFraude = "faible" | "moyen" | "eleve";

function normId(v: string) {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function notifierEquipeFraude(idDemande: string, titre: string, detail: string) {
  const { notifier } = await import("./lot2");
  const staff = await prisma.utilisateur.findMany({
    where: { typeCompte: "collaborateur", statut: "actif" },
    select: { id: true },
    take: 8,
  });
  await Promise.all(
    staff.map((s) => notifier(s.id, "fraude", titre, detail.slice(0, 280), idDemande)),
  );
}

async function ouvrirAlerte(opts: {
  idDemande: string;
  typeSignal: TypeSignalFraude;
  niveau?: NiveauFraude;
  detail: string;
  idDocument?: string | null;
  actionTache?: string;
  notifierStaff?: boolean;
}) {
  const ouverte = await prisma.alerteFraude.findFirst({
    where: {
      idDemande: opts.idDemande,
      typeSignal: opts.typeSignal,
      statut: { not: "levee" },
      ...(opts.idDocument ? { idDocument: opts.idDocument } : {}),
    },
  });
  if (ouverte) {
    await prisma.demande.update({
      where: { id: opts.idDemande },
      data: { controleRenforce: true },
    });
    return ouverte;
  }

  const alerte = await prisma.alerteFraude.create({
    data: {
      idDemande: opts.idDemande,
      idDocument: opts.idDocument ?? null,
      typeSignal: opts.typeSignal,
      niveau: opts.niveau ?? "moyen",
      statut: "ouverte",
      detail: opts.detail,
    },
  });

  await prisma.demande.update({
    where: { id: opts.idDemande },
    data: { controleRenforce: true },
  });

  if (opts.actionTache) {
    const deja = await prisma.tacheInterne.findFirst({
      where: {
        idDemande: opts.idDemande,
        action: opts.actionTache,
        statut: { not: "terminee" },
      },
    });
    if (!deja) {
      await prisma.tacheInterne.create({
        data: {
          idDemande: opts.idDemande,
          action: opts.actionTache,
          priorite: opts.niveau === "eleve" ? "urgent" : "haute",
        },
      });
    }
  }

  await prisma.journalAudit.create({
    data: {
      idActeur: null,
      action: "alerte_fraude",
      objetType: "alerte",
      objetId: alerte.id,
      idDemande: opts.idDemande,
      detail: `${opts.typeSignal}: ${alerte.detail}`,
    },
  });

  if (opts.notifierStaff !== false) {
    const demande = await prisma.demande.findUnique({
      where: { id: opts.idDemande },
      select: { reference: true },
    });
    await notifierEquipeFraude(
      opts.idDemande,
      `Fraude · ${demande?.reference ?? "dossier"}`,
      `${TYPES_SIGNAL[opts.typeSignal]} — ${opts.detail}`,
    );
  }

  return alerte;
}

/** Même empreinte SHA-256 sur un autre dossier — alerte des deux côtés, sans rejet auto. */
export async function signalerPiecePartagee(opts: {
  documentId: string;
  hash: string;
  idDemande: string;
}) {
  if (!opts.hash) return [];

  const autres = await prisma.document.findMany({
    where: {
      hash: opts.hash,
      type: "transmis",
      id: { not: opts.documentId },
      NOT: { idDemande: opts.idDemande },
    },
    take: 12,
    select: {
      id: true,
      idDemande: true,
      demande: { select: { reference: true } },
    },
  });
  if (autres.length === 0) return [];

  const refs = [...new Set(autres.map((d) => d.demande.reference))];
  const detailIci = `Même empreinte SHA-256 déjà vue sur ${refs.join(", ")}. Pas de rejet automatique.`;
  const alertes = [];

  const ici = await ouvrirAlerte({
    idDemande: opts.idDemande,
    typeSignal: "document_partage",
    niveau: "eleve",
    detail: detailIci,
    idDocument: opts.documentId,
    actionTache: "Contrôle renforcé — pièce déjà présente sur un autre dossier",
  });
  alertes.push(ici);

  const demandeIci = await prisma.demande.findUnique({
    where: { id: opts.idDemande },
    select: { reference: true },
  });
  const refIci = demandeIci?.reference ?? opts.idDemande;

  for (const autre of autres) {
    const a = await ouvrirAlerte({
      idDemande: autre.idDemande,
      typeSignal: "document_partage",
      niveau: "eleve",
      detail: `Même empreinte SHA-256 partagée avec ${refIci}. Pas de rejet automatique.`,
      idDocument: autre.id,
      actionTache: "Contrôle renforcé — pièce déjà présente sur un autre dossier",
      notifierStaff: false,
    });
    alertes.push(a);
  }

  return alertes;
}

/** Profil ≠ formulaire, dossiers divergents du même compte, ou identité partagée entre comptes. */
export async function signalerIdentiteInstable(idDemande: string) {
  const demande = await prisma.demande.findUnique({
    where: { id: idDemande },
    include: {
      utilisateur: { include: { profil: true } },
      reponses: { include: { champ: true } },
    },
  });
  if (!demande?.utilisateur.profil) return null;

  const profil = demande.utilisateur.profil;
  const byCode = Object.fromEntries(
    demande.reponses.map((r) => [r.champ.code, r.valeur.trim()]).filter(([, v]) => Boolean(v)),
  );

  const ecarts: string[] = [];
  if (byCode.nom && profil.nom && normId(byCode.nom) !== normId(profil.nom)) {
    ecarts.push(`nom formulaire « ${byCode.nom} » ≠ profil « ${profil.nom} »`);
  }
  if (byCode.prenom && profil.prenom && normId(byCode.prenom) !== normId(profil.prenom)) {
    ecarts.push(`prénom formulaire « ${byCode.prenom} » ≠ profil « ${profil.prenom} »`);
  }
  if (byCode.date_naissance && profil.dateNaissance && byCode.date_naissance !== profil.dateNaissance) {
    ecarts.push(
      `date de naissance formulaire « ${byCode.date_naissance} » ≠ profil « ${profil.dateNaissance} »`,
    );
  }

  const autresDemandes = await prisma.demande.findMany({
    where: { idUtilisateur: demande.idUtilisateur, id: { not: idDemande } },
    include: { reponses: { include: { champ: true } } },
    take: 12,
  });

  for (const autre of autresDemandes) {
    const autreBy = Object.fromEntries(
      autre.reponses.map((r) => [r.champ.code, r.valeur.trim()]).filter(([, v]) => Boolean(v)),
    );
    if (byCode.nom && autreBy.nom && normId(byCode.nom) !== normId(autreBy.nom)) {
      ecarts.push(`nom divergent avec dossier ${autre.reference} (« ${autreBy.nom} »)`);
    }
    if (
      byCode.date_naissance &&
      autreBy.date_naissance &&
      byCode.date_naissance !== autreBy.date_naissance
    ) {
      ecarts.push(
        `date de naissance divergente avec dossier ${autre.reference} (« ${autreBy.date_naissance} »)`,
      );
    }
  }

  const nomCle = byCode.nom || profil.nom;
  const prenomCle = byCode.prenom || profil.prenom;
  const dobCle = byCode.date_naissance || profil.dateNaissance || "";
  if (nomCle && prenomCle) {
    const homonymes = await prisma.profilCandidat.findMany({
      where: {
        idUtilisateur: { not: demande.idUtilisateur },
        nom: { equals: nomCle },
        prenom: { equals: prenomCle },
        ...(dobCle ? { dateNaissance: dobCle } : {}),
      },
      take: 5,
      include: { utilisateur: { select: { email: true } } },
    });
    // SQLite/Prisma equals is case-sensitive depending on collation — filter in JS
    const collisions = homonymes.filter(
      (p) =>
        normId(p.nom) === normId(nomCle) &&
        normId(p.prenom) === normId(prenomCle) &&
        (!dobCle || p.dateNaissance === dobCle),
    );
    if (collisions.length > 0) {
      ecarts.push(
        `identité proche sur un autre compte (${collisions.map((c) => c.utilisateur.email).join(", ")})`,
      );
    }
  }

  if (ecarts.length === 0) return null;

  return ouvrirAlerte({
    idDemande,
    typeSignal: "identite_instable",
    niveau: "moyen",
    detail: [...new Set(ecarts)].slice(0, 4).join(" · "),
    actionTache: "Contrôle renforcé — identité à vérifier",
  });
}

/** Référence réutilisée, montant hors attendu, ou transaction déjà vue ailleurs. */
export async function signalerPaiementIncoherent(opts: {
  idDemande: string;
  reference?: string;
  montantOperation?: number;
  idTransaction?: string;
}) {
  const espace = await prisma.espaceFinancier.findUnique({ where: { idDemande: opts.idDemande } });
  if (!espace) return null;

  const motifs: string[] = [];

  if (opts.reference && opts.reference.length >= 4) {
    const autres = await prisma.operationFinanciere.findMany({
      where: {
        reference: opts.reference,
        NOT: { idEspace: opts.idDemande },
      },
      take: 5,
      include: { espace: { include: { demande: { select: { reference: true } } } } },
    });
    if (autres.length > 0) {
      const refs = [...new Set(autres.map((o) => o.espace.demande.reference))].join(", ");
      motifs.push(`référence « ${opts.reference} » déjà utilisée sur ${refs}`);
    }
  }

  if (opts.idTransaction) {
    const doubleTx = await prisma.operationFinanciere.findFirst({
      where: {
        idTransaction: opts.idTransaction,
        NOT: { idEspace: opts.idDemande },
      },
      include: { espace: { include: { demande: { select: { reference: true } } } } },
    });
    if (doubleTx) {
      motifs.push(
        `transaction « ${opts.idTransaction} » déjà liée à ${doubleTx.espace.demande.reference}`,
      );
    }
  }

  const recuApres =
    opts.montantOperation != null ? espace.montantRecu + opts.montantOperation : espace.montantRecu;
  if (espace.montantAttendu > 0 && recuApres > espace.montantAttendu + 100) {
    motifs.push(
      `montant reçu (${recuApres} cts) dépasse l’attendu (${espace.montantAttendu} cts)`,
    );
  }

  if (opts.montantOperation != null && opts.montantOperation < 0) {
    motifs.push("montant d’opération négatif");
  }

  if (motifs.length === 0) return null;

  return ouvrirAlerte({
    idDemande: opts.idDemande,
    typeSignal: "paiement_incoherent",
    niveau: "eleve",
    detail: motifs.join(" · "),
    actionTache: "Contrôle renforcé — paiement incohérent",
  });
}

/** Analyse complète d’un dossier (déclenchée manuellement ou par cron). */
export async function analyserDemandeFraude(idDemande: string) {
  const docs = await prisma.document.findMany({
    where: { idDemande, hash: { not: "" } },
    select: { id: true, hash: true },
  });
  const alertes = [];
  for (const doc of docs) {
    const batch = await signalerPiecePartagee({
      documentId: doc.id,
      hash: doc.hash,
      idDemande,
    });
    alertes.push(...batch);
  }

  const id = await signalerIdentiteInstable(idDemande);
  if (id) alertes.push(id);

  const ops = await prisma.operationFinanciere.findMany({
    where: { idEspace: idDemande },
    select: { reference: true, idTransaction: true },
  });
  for (const op of ops) {
    const p = await signalerPaiementIncoherent({
      idDemande,
      reference: op.reference || undefined,
      idTransaction: op.idTransaction || undefined,
    });
    if (p) alertes.push(p);
  }
  const espace = await prisma.espaceFinancier.findUnique({ where: { idDemande } });
  if (espace) {
    const p = await signalerPaiementIncoherent({ idDemande });
    if (p) alertes.push(p);
  }

  return [...new Map(alertes.map((a) => [a.id, a])).values()];
}

/** Balayage périodique des dossiers actifs récents. */
export async function balayerFraudeRecente(limite = 40) {
  const depuis = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const dossiers = await prisma.demande.findMany({
    where: {
      statut: { notIn: ["cloturee", "abandonnee", "annulee"] },
      dateDerniereActivite: { gte: depuis },
    },
    select: { id: true },
    orderBy: { dateDerniereActivite: "desc" },
    take: limite,
  });

  let signaux = 0;
  for (const d of dossiers) {
    const alertes = await analyserDemandeFraude(d.id);
    signaux += alertes.length;
  }
  return { dossiers: dossiers.length, signaux };
}

export async function leverAlerteFraude(alerteId: string, idActeur: string) {
  const alerte = await prisma.alerteFraude.update({
    where: { id: alerteId },
    data: {
      statut: "levee",
      idActeurTraitement: idActeur,
      traiteAt: new Date(),
    },
  });
  const restantes = await prisma.alerteFraude.count({
    where: { idDemande: alerte.idDemande, statut: { not: "levee" } },
  });
  if (restantes === 0) {
    await prisma.demande.update({
      where: { id: alerte.idDemande },
      data: { controleRenforce: false },
    });
  }
  await prisma.journalAudit.create({
    data: {
      idActeur,
      action: "lever_fraude",
      objetType: "alerte",
      objetId: alerte.id,
      idDemande: alerte.idDemande,
      detail: "levée manuelle",
    },
  });
  return alerte;
}

export async function confirmerAlerteFraude(alerteId: string, idActeur: string) {
  const alerte = await prisma.alerteFraude.update({
    where: { id: alerteId },
    data: {
      statut: "confirmee",
      idActeurTraitement: idActeur,
      traiteAt: new Date(),
    },
  });
  await prisma.demande.update({
    where: { id: alerte.idDemande },
    data: { controleRenforce: true },
  });
  await prisma.journalAudit.create({
    data: {
      idActeur,
      action: "confirmer_fraude",
      objetType: "alerte",
      objetId: alerte.id,
      idDemande: alerte.idDemande,
      detail: "signal confirmé — contrôle renforcé maintenu",
    },
  });
  return alerte;
}

/** Garde métier : bloquer signature / clôture sensible si contrôle renforcé. */
export async function exigerPasDeControleRenforce(idDemande: string) {
  const demande = await prisma.demande.findUnique({
    where: { id: idDemande },
    select: { controleRenforce: true },
  });
  if (demande?.controleRenforce) {
    return { error: "Une alerte fraude est ouverte. Levez-la avant de continuer." };
  }
  return { ok: true as const };
}
