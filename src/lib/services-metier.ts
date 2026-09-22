"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { ecrireAudit, notifier } from "./lot2";
import { reponsesVersMap } from "./metier";
import { calculerAvancement } from "./metier";
import {
  OFFRES_VOL,
  aeroportPays,
  assurerCatalogueAssurance,
  trouverEtablissement,
} from "./catalogues";
import { creerHoldDuffel, rechercherOffresVol } from "./duffel";
import { souscrireChezAssureur } from "./assureur";
import { ecrireStockage } from "./fichiers";
import { nouvelleReference } from "./references";

const MENTION_HOLD = "Réservation confirmée – billet non émis";

async function checklist(demandeId: string, libelle: string, statut: "a_venir" | "en_attente" | "termine") {
  const item = await prisma.itemChecklist.findFirst({
    where: { idDemande: demandeId, libelle: { contains: libelle } },
  });
  if (item) await prisma.itemChecklist.update({ where: { id: item.id }, data: { statut } });
}

export async function ouvrirAssuranceDepuisAvi(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const idOrigine = String(formData.get("idOrigine") ?? "");
  const source = await prisma.demande.findFirst({
    where: { id: idOrigine, idUtilisateur: user.id },
    include: {
      offre: true,
      reponses: { include: { champ: true } },
    },
  });
  if (!source || source.offre.codeService !== "AVI") return { error: "Dossier AVI introuvable." };

  const deja = await prisma.demande.findFirst({
    where: { idOrigine, offre: { codeService: "ASSURANCE" } },
  });
  if (deja) redirect(`/demandes/${deja.id}?onglet=assurance`);

  const offre = await prisma.offreService.findUnique({
    where: { codePays_codeService: { codePays: source.offre.codePays, codeService: "ASSURANCE" } },
    include: { formulaire: { include: { champs: true } }, pieces: true },
  });
  if (!offre?.formulaire) return { error: "L’assurance n’est pas ouverte pour ce pays." };

  const map = reponsesVersMap(source.reponses);
  const debut = map.date_rentree || "";
  let fin = "";
  if (debut && map.duree_mois) {
    const d = new Date(debut);
    d.setMonth(d.getMonth() + Number(map.duree_mois || 6));
    fin = d.toISOString().slice(0, 10);
  }

  const valeurs: Record<string, string> = {};
  const profil = user.profil;
  for (const champ of offre.formulaire.champs) {
    if (champ.prefillDepuis === "email") valeurs[champ.code] = user.email;
    if (champ.prefillDepuis === "nom") valeurs[champ.code] = profil?.nom ?? "";
    if (champ.prefillDepuis === "prenom") valeurs[champ.code] = profil?.prenom ?? "";
    if (champ.prefillDepuis === "dateNaissance") valeurs[champ.code] = profil?.dateNaissance ?? "";
    if (champ.prefillDepuis === "telephone") valeurs[champ.code] = profil?.telephone ?? "";
    if (champ.prefillDepuis === "adresse") valeurs[champ.code] = profil?.adresse ?? "";
    if (champ.code === "date_debut") valeurs.date_debut = debut;
    if (champ.code === "date_fin") valeurs.date_fin = fin;
    if (champ.code === "formule") valeurs.formule = "confort";
  }

  const reference = await nouvelleReference("ASSURANCE", offre.codePays);

  const created = await prisma.demande.create({
    data: {
      reference,
      idUtilisateur: user.id,
      idOffre: offre.id,
      idOrigine: source.id,
      etapeCourante: "formulaire",
      pourcentageAvancement: calculerAvancement(offre.formulaire.champs, valeurs),
      reponses: {
        create: offre.formulaire.champs
          .filter((c) => valeurs[c.code])
          .map((c) => ({ idChamp: c.id, valeur: valeurs[c.code] })),
      },
      checklist: {
        create: [
          { libelle: "Informations personnelles", statut: "en_attente", ordre: 1 },
          { libelle: "Choix de formule", statut: "en_attente", ordre: 2 },
          { libelle: "Passeport", statut: "a_venir", ordre: 3 },
          { libelle: "Paiement des frais", statut: "a_venir", ordre: 20 },
          { libelle: "Attestation", statut: "a_venir", ordre: 21 },
        ],
      },
    },
  });

  const { assurerEspaceFinancier } = await import("./lot3");
  await assurerEspaceFinancier(created.id);
  await ecrireAudit(user.id, "vente_croisee", "demande", created.id, source.id, "AVI → assurance");
  await notifier(user.id, "assurance", "Assurance préremplie", `Nouveau dossier ${created.reference} depuis ${source.reference}.`, created.id);
  revalidatePath("/tableau-de-bord");
  redirect(`/demandes/${created.id}?onglet=assurance`);
}

export async function souscrirePolice(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const codeFormule = String(formData.get("formule") ?? "essentielle");

  await assurerCatalogueAssurance();
  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: user.id },
    include: {
      reponses: { include: { champ: true } },
      offre: { include: { pays: true } },
      utilisateur: { include: { profil: true } },
    },
  });
  if (!demande || demande.offre.codeService !== "ASSURANCE") return { error: "Dossier assurance introuvable." };

  const map = reponsesVersMap(demande.reponses);
  if (!map.date_debut || !map.date_fin) return { error: "Renseignez d’abord les dates du séjour." };

  const formule = await prisma.formuleAssurance.findUnique({ where: { code: codeFormule } });
  if (!formule) return { error: "Formule inconnue." };

  const policeOp = await souscrireChezAssureur({
    demandeId: demande.id,
    reference: demande.reference,
    codeFormule,
    dateDebut: map.date_debut,
    dateFin: map.date_fin,
    destinationPays: demande.offre.pays?.libelle ?? demande.offre.codePays,
    assure: {
      nom: user.profil?.nom ?? map.nom,
      prenom: user.profil?.prenom ?? map.prenom,
      email: user.email,
      dateNaissance: user.profil?.dateNaissance ?? map.date_naissance,
      telephone: user.profil?.telephone ?? map.telephone,
      nationalite: user.profil?.nationalite,
    },
  });
  if (!policeOp.ok) return { error: policeOp.error };

  const champFormule = demande.reponses.find((r) => r.champ.code === "formule");
  if (champFormule) {
    await prisma.reponseFormulaire.update({ where: { id: champFormule.id }, data: { valeur: codeFormule } });
  }

  await prisma.policeAssurance.upsert({
    where: { idDemande: demande.id },
    update: { idFormule: formule.id, dateDebut: map.date_debut, dateFin: map.date_fin, statut: "tarifee", idExterne: policeOp.data.idExterne },
    create: {
      idDemande: demande.id,
      idFormule: formule.id,
      dateDebut: map.date_debut,
      dateFin: map.date_fin,
      statut: "tarifee",
      idExterne: policeOp.data.idExterne,
    },
  });

  // Prix à payer = barème figé + supplément formule (sans cumuler si on change de formule)
  const { assurerEspaceFinancier } = await import("./lot3");
  await assurerEspaceFinancier(demande.id);
  const tarif = await prisma.tarifApplique.findUnique({ where: { idDemande: demande.id } });
  const montantAttendu = tarif
    ? tarif.montantAccepte + tarif.frais + formule.supplement
    : 8900 + 900 + formule.supplement;
  await prisma.espaceFinancier.update({
    where: { idDemande: demande.id },
    data: { montantAttendu },
  });

  await checklist(demande.id, "formule", "termine");
  await prisma.demande.update({
    where: { id: demande.id },
    data: { etapeCourante: "tarification", dateDerniereActivite: new Date() },
  });
  await ecrireAudit(user.id, "police", "police", demande.id, demande.id, formule.libelle);
  revalidatePath(`/demandes/${demande.id}`);
  return { ok: true };
}

export async function emettreAttestationAssurance(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: user.id },
    include: {
      utilisateur: { include: { profil: true } },
      offre: { include: { pays: true } },
      police: { include: { formule: { include: { garanties: { include: { garantie: true } } } } } },
      espaceFinancier: true,
    },
  });
  if (!demande?.police) return { error: "Souscrivez d’abord une formule." };
  if (demande.espaceFinancier && demande.espaceFinancier.statutFonds !== "fonds_recus") {
    return { error: "L’attestation est émise après réception des fonds." };
  }

  const { modeAssureur } = await import("./assureur");
  const mode = modeAssureur();
  const garanties = demande.police.formule.garanties
    .map(
      (g) =>
        `<tr><td style="padding:8px 0;border-top:1px solid #d7e4f7">${g.garantie.libelle}</td><td style="padding:8px 0;border-top:1px solid #d7e4f7;text-align:right">${g.garantie.plafond}</td></tr>`,
    )
    .join("");
  const nom = `${demande.utilisateur.profil?.prenom ?? ""} ${demande.utilisateur.profil?.nom ?? ""}`.trim();
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Attestation ${demande.reference}</title>
  <style>
    body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#0d1b2e;line-height:1.5}
    .brand{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#1a6fd4}
    h1{font-size:28px;letter-spacing:-.02em;margin:8px 0 24px}
    .meta{color:#5b6472;font-size:14px;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin:24px 0}
    .box{border:1px solid #d7e4f7;border-radius:12px;padding:16px 20px;margin:20px 0;background:#f4f7fc}
    .foot{margin-top:32px;font-size:12px;color:#5b6472}
  </style></head><body>
  <p class="brand">HCGF — Horizon Caution &amp; Garantie Financière</p>
  <h1>Attestation d’assurance voyage</h1>
  <div class="box">
    <p class="meta">Dossier <strong>${demande.reference}</strong></p>
    <p class="meta">Assuré : <strong>${nom || user.email}</strong></p>
    <p class="meta">Destination : ${demande.offre.pays.libelle}</p>
    <p class="meta">Formule : <strong>${demande.police.formule.libelle}</strong></p>
    <p class="meta">Période : du ${demande.police.dateDebut} au ${demande.police.dateFin}</p>
    ${demande.police.idExterne ? `<p class="meta">Réf. assureur : ${demande.police.idExterne}</p>` : ""}
    <p class="meta">Mode : ${mode === "api" ? "Partenaire assureur" : "Attestation plateforme (démo)"}</p>
  </div>
  <p><strong>Garanties incluses</strong></p>
  <table>${garanties}</table>
  <p class="foot">Document rattaché uniquement au dossier ${demande.reference}. Il ne se mélange pas à un dossier AVI, hébergement ou vol.
  ${mode === "demo" ? "Document de démonstration — branchez ASSUREUR_API_URL / ASSUREUR_API_KEY pour une police partenaire." : "Police émise via le partenaire assureur configuré."}</p>
  </body></html>`;

  const filename = `${demande.reference}-attestation-assurance.html`;
  await ecrireStockage(filename, html);
  await prisma.policeAssurance.update({
    where: { idDemande: demande.id },
    data: { statut: "attestation", storagePath: filename },
  });
  await checklist(demande.id, "Attestation", "termine");
  await prisma.demande.update({
    where: { id: demande.id },
    data: { etapeCourante: "attestation", dateDerniereActivite: new Date() },
  });
  revalidatePath(`/demandes/${demande.id}`);
  return { ok: true };
}

export async function rechercherVolsAction(depart: string, arrivee: string, date?: string) {
  return rechercherOffresVol({ origin: depart, destination: arrivee, date });
}

export async function poserHold(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const offreCode = String(formData.get("offreCode") ?? "");

  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: user.id },
    include: { utilisateur: { include: { profil: true } }, reponses: { include: { champ: true } } },
  });
  if (!demande) return { error: "Dossier introuvable." };

  const map = reponsesVersMap(demande.reponses);
  const catalogue = await rechercherOffresVol({
    origin: map.aeroport_depart || "CDG",
    destination: map.aeroport_arrivee || "",
    date: map.date_depart,
    dateRetour: map.date_retour,
    idDemande: demande.id,
  });
  const offre = catalogue.find((o) => o.code === offreCode) ?? OFFRES_VOL.find((o) => o.code === offreCode);
  if (!offre) return { error: "Offre introuvable ou expirée — relancez la recherche." };
  if (!offre.hold) {
    return { error: "Cette offre exige un paiement immédiat : le Hold est interdit." };
  }

  const hold = await creerHoldDuffel({
    demandeId: demande.id,
    offre,
    passager: {
      prenom: user.profil?.prenom || map.prenom || "Voyageur",
      nom: user.profil?.nom || map.nom || "HCGF",
      dateNaissance: user.profil?.dateNaissance || map.date_naissance || "1998-01-15",
      email: user.email,
      telephone: user.profil?.telephone || map.telephone || "",
      sexe: map.sexe || "",
    },
  });
  if (!hold.ok) return { error: hold.error };

  const cle = `${demande.id}:${offre.code}`;
  const existante = await prisma.reservationVol.findUnique({ where: { cleIdempotence: cle } });
  if (existante) return { error: "Un Hold existe déjà pour cette offre (idempotence)." };

  const limit =
    hold.data.paymentRequiredBy != null
      ? new Date(hold.data.paymentRequiredBy)
      : new Date(Date.now() + offre.garantieHeures * 3600 * 1000);
  const reservation = await prisma.reservationVol.create({
    data: {
      idUtilisateur: user.id,
      idDemande: demande.id,
      offreCode: offre.code,
      provider: hold.data.provider,
      providerOrderId: hold.data.providerOrderId,
      bookingReference: hold.data.bookingReference,
      airlineName: offre.airline,
      totalAmount: offre.prix,
      currency: offre.currency ?? "EUR",
      paymentRequiredBy: limit,
      priceGuaranteeExpiresAt: limit,
      requiresInstantPayment: false,
      cleIdempotence: cle,
      statut: "HELD",
      segments: {
        create: [
          {
            ordre: 1,
            aeroportDepart: offre.from,
            aeroportArrivee: offre.to,
            depart: offre.depart,
            arrivee: offre.arrivee,
            transporteurCommercial: offre.airline,
            transporteurOperant: offre.airline,
          },
        ],
      },
      passagers: {
        create: {
          nom: user.profil?.nom ?? "",
          prenom: user.profil?.prenom ?? "",
          dateNaissance: user.profil?.dateNaissance ?? "",
          nationalite: user.profil?.nationalite ?? "",
        },
      },
    },
  });

  await prisma.demande.update({
    where: { id: demande.id },
    data: { etapeCourante: "hold", dateDerniereActivite: new Date() },
  });
  await ecrireAudit(user.id, "hold", "reservation", reservation.id, demande.id, hold.data.bookingReference);
  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath("/vols");
  return { ok: true };
}

export async function emettreJustificatifVol(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const id = String(formData.get("reservationId") ?? "");
  const reservation = await prisma.reservationVol.findFirst({
    where: { id, idUtilisateur: user.id },
    include: { segments: { orderBy: { ordre: "asc" } }, passagers: true, demande: true },
  });
  if (!reservation || reservation.statut !== "HELD") return { error: "Hold non confirmé." };

  const segs = reservation.segments
    .map((s) => `<tr><td>${s.aeroportDepart} → ${s.aeroportArrivee}</td><td>${s.depart}–${s.arrivee}</td><td>${s.transporteurCommercial}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Hold ${reservation.bookingReference}</title>
  <style>body{font-family:Inter,sans-serif;max-width:680px;margin:48px auto;color:#0d2b4a}table{width:100%;border-collapse:collapse}td,th{padding:8px 0;border-top:1px solid #d7e4f7;text-align:left}.warn{color:#c93400;font-weight:600}</style></head><body>
  <p>AVI — Réservation de vol</p>
  <h1 class="warn">${MENTION_HOLD}</h1>
  <p>PNR ${reservation.bookingReference} · ${reservation.airlineName}</p>
  <p>Paiement requis avant le ${reservation.paymentRequiredBy?.toLocaleString("fr-FR", { timeZone: reservation.timezone })} (${reservation.timezone}).</p>
  <p>Prix indicatif ${(reservation.totalAmount / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} — garantie jusqu’à ${reservation.priceGuaranteeExpiresAt?.toLocaleString("fr-FR", { timeZone: reservation.timezone }) ?? "non garantie"}.</p>
  <table>${segs}</table>
  <p>Ce document n’est pas un billet électronique. Aucun e-ticket n’a été émis.</p>
  </body></html>`;

  const filename = `hold-${reservation.bookingReference}.html`;
  await ecrireStockage(filename, html);
  await prisma.justificatifVol.upsert({
    where: { idReservation: reservation.id },
    update: { mention: MENTION_HOLD, storagePath: filename, nom: `Hold ${reservation.bookingReference}` },
    create: {
      idReservation: reservation.id,
      mention: MENTION_HOLD,
      storagePath: filename,
      nom: `Hold ${reservation.bookingReference}`,
    },
  });
  if (reservation.idDemande) {
    await prisma.demande.update({
      where: { id: reservation.idDemande },
      data: { etapeCourante: "justificatif" },
    });
    revalidatePath(`/demandes/${reservation.idDemande}`);
  }
  revalidatePath("/vols");
  return { ok: true };
}

export async function payerBilletVol(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const id = String(formData.get("reservationId") ?? "");
  const reservation = await prisma.reservationVol.findFirst({
    where: { id, idUtilisateur: user.id },
  });
  if (!reservation) return { error: "Réservation introuvable." };
  if (reservation.statut === "TICKETED") return { error: "Billet déjà émis." };
  if (reservation.statut !== "HELD" && reservation.statut !== "EXPIRING_SOON") {
    return { error: "Seul un Hold actif peut être payé." };
  }
  if (reservation.paymentRequiredBy && reservation.paymentRequiredBy.getTime() < Date.now()) {
    await prisma.reservationVol.update({
      where: { id: reservation.id },
      data: { statut: "EXPIRED" },
    });
    return { error: "Le Hold a expiré. Relancez une recherche." };
  }

  const { payerHoldDuffel } = await import("./duffel");
  const paiement = await payerHoldDuffel({
    demandeId: reservation.idDemande,
    providerOrderId: reservation.providerOrderId,
    montantCentimes: reservation.totalAmount,
    currency: reservation.currency || "EUR",
  });
  if (!paiement.ok) return { error: paiement.error };

  await prisma.reservationVol.update({
    where: { id: reservation.id },
    data: { statut: "TICKETED" },
  });

  if (reservation.idDemande) {
    await prisma.demande.update({
      where: { id: reservation.idDemande },
      data: { etapeCourante: "billet", dateDerniereActivite: new Date() },
    });
    revalidatePath(`/demandes/${reservation.idDemande}`);
  }
  await ecrireAudit(
    user.id,
    "billet_emis",
    "reservation",
    reservation.id,
    reservation.idDemande,
    paiement.data.paymentId,
  );
  revalidatePath("/vols");
  return { ok: true };
}

export async function lancerMatching(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const demande = await prisma.demande.findFirst({
    where: { id: demandeId, idUtilisateur: user.id },
    include: { reponses: { include: { champ: true } }, offre: true },
  });
  if (!demande || demande.offre.codeService !== "HEBERGEMENT") return { error: "Dossier hébergement introuvable." };

  const map = reponsesVersMap(demande.reponses);
  const idEtab = trouverEtablissement(map.etablissement || "");
  if (!idEtab) {
    return { error: "Indiquez d’abord l’établissement d’accueil dans le formulaire." };
  }
  await prisma.demande.update({
    where: { id: demande.id },
    data: { idEtablissement: idEtab, etapeCourante: "matching", dateDerniereActivite: new Date() },
  });

  const compatibles = await prisma.matching.count({
    where: { idEtablissement: idEtab, statut: "COMPATIBLE", logement: { statut: "disponible", bailleur: { statutValidation: "valide" } } },
  });
  if (compatibles === 0) {
    await prisma.listeAttente.upsert({
      where: { idDemande: demande.id },
      update: { statut: "inscrit", criteres: map.etablissement || idEtab },
      create: { idDemande: demande.id, criteres: map.etablissement || idEtab },
    });
  }
  revalidatePath(`/demandes/${demande.id}`);
  return { ok: true, compatibles };
}

export async function choisirLogement(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const idLogement = String(formData.get("idLogement") ?? "");

  const dossier = await prisma.demande.findFirst({ where: { id: demandeId, idUtilisateur: user.id } });
  if (!dossier) return { error: "Dossier introuvable." };
  const matching = await prisma.matching.findFirst({
    where: {
      idLogement,
      idEtablissement: dossier.idEtablissement ?? undefined,
      statut: "COMPATIBLE",
      logement: { statut: "disponible" },
    },
    include: { logement: { include: { bailleur: true } } },
  });
  if (!matching || matching.dureeTransportMin > 40) return { error: "Ce logement n’est pas compatible (≤ 40 min)." };

  await prisma.affectation.upsert({
    where: { idDemande: demandeId },
    update: { idLogement, statut: "choisi" },
    create: { idDemande: demandeId, idLogement, statut: "choisi" },
  });
  await prisma.logement.update({ where: { id: idLogement }, data: { statut: "reserve" } });
  await prisma.listeAttente.deleteMany({ where: { idDemande: demandeId } });
  await prisma.demande.update({
    where: { id: demandeId },
    data: { etapeCourante: "signature", dateDerniereActivite: new Date() },
  });
  await checklist(demandeId, "logement", "termine");
  await ecrireAudit(user.id, "affectation", "logement", idLogement, demandeId, matching.logement.titre);
  revalidatePath(`/demandes/${demandeId}`);
  return { ok: true };
}

export async function inscrireListeAttente(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const demandeId = String(formData.get("demandeId") ?? "");
  const demande = await prisma.demande.findFirst({
    where: user.typeCompte === "collaborateur" ? { id: demandeId } : { id: demandeId, idUtilisateur: user.id },
    select: { id: true },
  });
  if (!demande) return { error: "Dossier introuvable." };
  await prisma.listeAttente.upsert({
    where: { idDemande: demande.id },
    update: { statut: "inscrit" },
    create: { idDemande: demande.id, criteres: "aucun logement ≤ 40 min" },
  });
  await prisma.demande.update({
    where: { id: demande.id },
    data: { etapeCourante: "matching" },
  });
  revalidatePath(`/demandes/${demande.id}`);
  return { ok: true };
}

export { aeroportPays };
