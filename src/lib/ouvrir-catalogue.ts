import { prisma } from "./prisma";

const PAYS = [
  { code: "FR", libelle: "France" },
  { code: "DE", libelle: "Allemagne" },
  { code: "BE", libelle: "Belgique" },
  { code: "IT", libelle: "Italie" },
  { code: "CA", libelle: "Canada" },
];

const SERVICES = [
  { code: "AVI", libelle: "AVI / justificatif financier" },
  { code: "ASSURANCE", libelle: "Assurance voyage" },
  { code: "HEBERGEMENT", libelle: "Attestation d'hébergement" },
  { code: "VOL", libelle: "Réservation de vol" },
];

type Champ = {
  code: string;
  typeSaisie: string;
  obligatoire: boolean;
  ordre: number;
  libelle: string;
  aide?: string;
  options?: string[];
};

const identite: Champ[] = [
  { code: "nom", typeSaisie: "text", obligatoire: true, ordre: 1, libelle: "Nom", },
  { code: "prenom", typeSaisie: "text", obligatoire: true, ordre: 2, libelle: "Prénom" },
  { code: "date_naissance", typeSaisie: "date", obligatoire: true, ordre: 3, libelle: "Date de naissance" },
  { code: "telephone", typeSaisie: "tel", obligatoire: true, ordre: 4, libelle: "Téléphone" },
  { code: "email", typeSaisie: "email", obligatoire: true, ordre: 5, libelle: "E-mail" },
  { code: "adresse", typeSaisie: "text", obligatoire: true, ordre: 6, libelle: "Adresse" },
];

const OFFRES_IT = [
  {
    service: "AVI",
    texte: "Attestation de moyens / virement irrévocable pour une poursuite d'études en Italie.",
    etapes: ["formulaire", "contrat", "documents", "paiement", "validation"],
    montant: 14900,
    champs: [
      ...identite,
      { code: "nationalite", typeSaisie: "text", obligatoire: false, ordre: 7, libelle: "Nationalité" },
      { code: "numero_passeport", typeSaisie: "text", obligatoire: false, ordre: 8, libelle: "Numéro de passeport" },
      {
        code: "garant_financier",
        typeSaisie: "text",
        obligatoire: false,
        ordre: 9,
        libelle: "Garant financier",
        aide: "Laisser vide si le bénéficiaire verse lui-même les fonds.",
      },
      { code: "etablissement", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Établissement d'accueil en Italie" },
      { code: "formation", typeSaisie: "text", obligatoire: false, ordre: 11, libelle: "Formation / corso di studio" },
      { code: "date_rentree", typeSaisie: "date", obligatoire: true, ordre: 12, libelle: "Date de rentrée" },
      { code: "duree_mois", typeSaisie: "number", obligatoire: true, ordre: 13, libelle: "Durée du séjour (mois)" },
      {
        code: "montant_avi",
        typeSaisie: "number",
        obligatoire: true,
        ordre: 14,
        libelle: "Montant bloqué (€)",
        aide: "Montant exigé pour le visa / la preuve de moyens Italie.",
      },
    ] satisfies Champ[],
    pieces: [
      { typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 },
      { typePiece: "admission", libelle: "Admission / préinscription", obligatoire: true, ordreFusion: 3 },
      { typePiece: "justificatifs_financiers", libelle: "Justificatifs financiers", obligatoire: true, ordreFusion: 4 },
    ],
  },
  {
    service: "ASSURANCE",
    texte: "Assurance voyage pour une destination Italie.",
    etapes: ["formulaire", "tarification", "paiement", "attestation"],
    montant: 8900,
    champs: [
      ...identite,
      { code: "date_debut", typeSaisie: "date", obligatoire: true, ordre: 10, libelle: "Début du séjour" },
      { code: "date_fin", typeSaisie: "date", obligatoire: true, ordre: 11, libelle: "Fin du séjour" },
      {
        code: "formule",
        typeSaisie: "select",
        obligatoire: true,
        ordre: 12,
        libelle: "Formule",
        options: ["essentielle", "confort", "premium"],
      },
    ] satisfies Champ[],
    pieces: [{ typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 }],
  },
  {
    service: "VOL",
    texte: "Vol Hold Afrique ↔ Italie (FCO, MXP, LIN). ITA Airways, Air France, Ethiopian…",
    etapes: ["recherche", "passager", "hold", "justificatif"],
    montant: 3900,
    champs: [
      ...identite,
      {
        code: "aeroport_depart",
        typeSaisie: "text",
        obligatoire: true,
        ordre: 10,
        libelle: "Aéroport / ville de départ",
        aide: "Ex. DLA, ABJ, DSS, TUN, CMN, ADD…",
      },
      {
        code: "aeroport_arrivee",
        typeSaisie: "text",
        obligatoire: true,
        ordre: 11,
        libelle: "Aéroport / ville d'arrivée",
        aide: "Italie : FCO, MXP, LIN, NAP — Rome, Milan, Naples.",
      },
      { code: "date_depart", typeSaisie: "date", obligatoire: true, ordre: 12, libelle: "Date de départ" },
      { code: "date_retour", typeSaisie: "date", obligatoire: false, ordre: 13, libelle: "Date de retour (si aller-retour)" },
    ] satisfies Champ[],
    pieces: [{ typePiece: "passeport", libelle: "Passeport / document de voyage", obligatoire: true, ordreFusion: 2 }],
  },
];

export async function assurerPaysOuverts() {
  for (const p of PAYS) {
    await prisma.pays.upsert({
      where: { code: p.code },
      update: { libelle: p.libelle, actif: true },
      create: { ...p, actif: true },
    });
  }
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: { libelle: s.libelle, actif: true },
      create: { ...s, actif: true },
    });
  }

  for (const offre of OFFRES_IT) {
    const created = await prisma.offreService.upsert({
      where: { codePays_codeService: { codePays: "IT", codeService: offre.service } },
      update: {
        texteExplicatif: offre.texte,
        etapesParcours: JSON.stringify(offre.etapes),
        actif: true,
      },
      create: {
        codePays: "IT",
        codeService: offre.service,
        texteExplicatif: offre.texte,
        etapesParcours: JSON.stringify(offre.etapes),
        actif: true,
        pieces: { create: offre.pieces },
        formulaire: {
          create: {
            code: `${offre.service}-IT`,
            version: "1.0",
            champs: {
              create: offre.champs.map((c) => ({
                code: c.code,
                typeSaisie: c.typeSaisie,
                obligatoire: c.obligatoire,
                ordre: c.ordre,
                libelle: c.libelle,
                aide: c.aide ?? null,
                optionsJson: c.options ? JSON.stringify(c.options) : null,
              })),
            },
          },
        },
      },
    });

    const formulaire = await prisma.formulaire.findFirst({ where: { idOffre: created.id }, include: { champs: true } });
    if (!formulaire) {
      await prisma.formulaire.create({
        data: {
          idOffre: created.id,
          code: `${offre.service}-IT`,
          version: "1.0",
          champs: {
            create: offre.champs.map((c) => ({
              code: c.code,
              typeSaisie: c.typeSaisie,
              obligatoire: c.obligatoire,
              ordre: c.ordre,
              libelle: c.libelle,
              aide: c.aide ?? null,
              optionsJson: c.options ? JSON.stringify(c.options) : null,
            })),
          },
        },
      });
    } else {
      for (const c of offre.champs) {
        if (!formulaire.champs.some((x) => x.code === c.code)) {
          await prisma.champFormulaire.create({
            data: {
              idFormulaire: formulaire.id,
              code: c.code,
              typeSaisie: c.typeSaisie,
              obligatoire: c.obligatoire,
              ordre: c.ordre,
              libelle: c.libelle,
              aide: c.aide ?? null,
              optionsJson: c.options ? JSON.stringify(c.options) : null,
            },
          });
        }
      }
    }

    const piecesExistantes = await prisma.pieceRequise.count({ where: { idOffre: created.id } });
    if (piecesExistantes === 0) {
      await prisma.pieceRequise.createMany({
        data: offre.pieces.map((piece) => ({ ...piece, idOffre: created.id })),
      });
    }

    const bareme = await prisma.baremeTarifaire.findFirst({
      where: { idOffre: created.id, version: "2026.1" },
    });
    if (!bareme) {
      await prisma.baremeTarifaire.create({
        data: { idOffre: created.id, version: "2026.1", montant: offre.montant, frais: 900 },
      });
    }
  }
}
