import { existsSync } from "fs";
import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";
import { assurerCodeAccesRoles, renouvelerCodeAccesRoles } from "./code-acces";

const prisma = new PrismaClient();

type ChampSeed = {
  code: string;
  typeSaisie: string;
  obligatoire: boolean;
  ordre: number;
  libelle: string;
  aide?: string;
  options?: string[];
  conditionChamp?: string;
  conditionOp?: string;
  conditionValeur?: string;
  prefillDepuis?: string;
};

const pays = [
  { code: "FR", libelle: "France" },
  { code: "DE", libelle: "Allemagne" },
  { code: "BE", libelle: "Belgique" },
  { code: "CA", libelle: "Canada" },
];

const services = [
  { code: "AVI", libelle: "AVI / justificatif financier" },
  { code: "ASSURANCE", libelle: "Assurance voyage" },
  { code: "HEBERGEMENT", libelle: "Attestation d'hébergement" },
  { code: "VOL", libelle: "Réservation de vol" },
];

function champsIdentite(): ChampSeed[] {
  return [
    { code: "nom", typeSaisie: "text", obligatoire: true, ordre: 1, libelle: "Nom", prefillDepuis: "nom" },
    { code: "prenom", typeSaisie: "text", obligatoire: true, ordre: 2, libelle: "Prénom", prefillDepuis: "prenom" },
    { code: "date_naissance", typeSaisie: "date", obligatoire: true, ordre: 3, libelle: "Date de naissance", prefillDepuis: "dateNaissance" },
    { code: "telephone", typeSaisie: "tel", obligatoire: true, ordre: 4, libelle: "Téléphone", prefillDepuis: "telephone" },
    { code: "email", typeSaisie: "email", obligatoire: true, ordre: 5, libelle: "E-mail", prefillDepuis: "email" },
    { code: "adresse", typeSaisie: "text", obligatoire: true, ordre: 6, libelle: "Adresse", prefillDepuis: "adresse" },
  ];
}

const offres: {
  pays: string;
  service: string;
  texte: string;
  etapes: string[];
  champs: ChampSeed[];
  pieces: { typePiece: string; libelle: string; obligatoire: boolean; ordreFusion: number }[];
}[] = [
  {
    pays: "FR",
    service: "AVI",
    texte: "Attestation de virement irrévocable pour une poursuite d'études en France.",
    etapes: ["formulaire", "documents", "paiement", "validation"],
    champs: [
      ...champsIdentite(),
      { code: "etablissement", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Établissement d'accueil" },
      { code: "date_rentree", typeSaisie: "date", obligatoire: true, ordre: 11, libelle: "Date de rentrée" },
      { code: "duree_mois", typeSaisie: "number", obligatoire: true, ordre: 12, libelle: "Durée du séjour (mois)" },
      { code: "montant_avi", typeSaisie: "number", obligatoire: true, ordre: 13, libelle: "Montant AVI (€)", aide: "Montant exigé selon la durée et les règles France." },
    ],
    pieces: [
      { typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 },
      { typePiece: "admission", libelle: "Admission / préinscription", obligatoire: true, ordreFusion: 3 },
      { typePiece: "justificatifs_financiers", libelle: "Justificatifs financiers", obligatoire: true, ordreFusion: 4 },
    ],
  },
  {
    pays: "DE",
    service: "AVI",
    texte: "Parcours Allemagne : le dossier s'adapte selon que vous avez déjà une admission.",
    etapes: ["formulaire", "documents", "paiement", "validation"],
    champs: [
      ...champsIdentite(),
      { code: "etablissement", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Établissement d'accueil" },
      { code: "date_rentree", typeSaisie: "date", obligatoire: true, ordre: 11, libelle: "Date de rentrée" },
      {
        code: "a_admission",
        typeSaisie: "select",
        obligatoire: true,
        ordre: 12,
        libelle: "Disposez-vous déjà d'une admission ?",
        options: ["oui", "non"],
      },
      {
        code: "reference_admission",
        typeSaisie: "text",
        obligatoire: true,
        ordre: 13,
        libelle: "Référence du document d'admission",
        conditionChamp: "a_admission",
        conditionOp: "eq",
        conditionValeur: "oui",
      },
      { code: "montant_avi", typeSaisie: "number", obligatoire: true, ordre: 14, libelle: "Montant bloqué (€)" },
    ],
    pieces: [
      { typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 },
      { typePiece: "admission", libelle: "Admission", obligatoire: false, ordreFusion: 3 },
    ],
  },
  {
    pays: "BE",
    service: "AVI",
    texte: "Solution adaptée à une poursuite d'études en Belgique.",
    etapes: ["formulaire", "documents", "paiement", "validation"],
    champs: [
      ...champsIdentite(),
      { code: "etablissement", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Établissement" },
      { code: "date_rentree", typeSaisie: "date", obligatoire: true, ordre: 11, libelle: "Date de rentrée" },
      { code: "montant_avi", typeSaisie: "number", obligatoire: true, ordre: 12, libelle: "Montant (€)" },
    ],
    pieces: [
      { typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 },
      { typePiece: "admission", libelle: "Admission", obligatoire: true, ordreFusion: 3 },
    ],
  },
  {
    pays: "CA",
    service: "AVI",
    texte: "Solution adaptée à une poursuite d'études au Canada.",
    etapes: ["formulaire", "documents", "paiement", "validation"],
    champs: [
      ...champsIdentite(),
      { code: "etablissement", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Établissement" },
      { code: "date_rentree", typeSaisie: "date", obligatoire: true, ordre: 11, libelle: "Date de rentrée" },
      { code: "montant_avi", typeSaisie: "number", obligatoire: true, ordre: 12, libelle: "Montant (CAD)" },
    ],
    pieces: [
      { typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 },
      { typePiece: "admission", libelle: "Lettre d'acceptation", obligatoire: true, ordreFusion: 3 },
    ],
  },
  {
    pays: "FR",
    service: "ASSURANCE",
    texte: "Souscription d'une assurance voyage. Les informations déjà connues sont préremplies.",
    etapes: ["formulaire", "tarification", "paiement", "attestation"],
    champs: [
      ...champsIdentite(),
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
    ],
    pieces: [{ typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 }],
  },
  {
    pays: "DE",
    service: "ASSURANCE",
    texte: "Assurance voyage pour une destination Allemagne.",
    etapes: ["formulaire", "tarification", "paiement", "attestation"],
    champs: [
      ...champsIdentite(),
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
    ],
    pieces: [{ typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 }],
  },
  {
    pays: "FR",
    service: "HEBERGEMENT",
    texte: "Recherche d'un logement à 40 minutes maximum en transports de votre établissement.",
    etapes: ["formulaire", "matching", "documents", "signature"],
    champs: [
      ...champsIdentite(),
      { code: "etablissement", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Établissement" },
      { code: "date_rentree", typeSaisie: "date", obligatoire: true, ordre: 11, libelle: "Date de rentrée" },
    ],
    pieces: [{ typePiece: "passeport", libelle: "Passeport", obligatoire: true, ordreFusion: 2 }],
  },
  {
    pays: "FR",
    service: "VOL",
    texte: "Réservation Hold : PNR réel, billet non émis, date limite affichée.",
    etapes: ["recherche", "passager", "hold", "justificatif"],
    champs: [
      ...champsIdentite(),
      { code: "aeroport_depart", typeSaisie: "text", obligatoire: true, ordre: 10, libelle: "Aéroport / ville de départ" },
      { code: "aeroport_arrivee", typeSaisie: "text", obligatoire: true, ordre: 11, libelle: "Aéroport / ville d'arrivée" },
      { code: "date_depart", typeSaisie: "date", obligatoire: true, ordre: 12, libelle: "Date de départ" },
      { code: "date_retour", typeSaisie: "date", obligatoire: false, ordre: 13, libelle: "Date de retour (si aller-retour)" },
    ],
    pieces: [{ typePiece: "passeport", libelle: "Passeport / document de voyage", obligatoire: true, ordreFusion: 2 }],
  },
];

function prixOffre(codeService: string) {
  if (codeService === "AVI") return 14900;
  if (codeService === "ASSURANCE") return 8900;
  if (codeService === "HEBERGEMENT") return 7900;
  return 3900;
}

function estPostgres() {
  const url = process.env.DATABASE_URL ?? "";
  return url.includes("postgres") || url.includes("neon") || Boolean(process.env.VERCEL);
}

async function assurerCatalogue() {
  for (const p of pays) {
    await prisma.pays.upsert({
      where: { code: p.code },
      update: { libelle: p.libelle, actif: true },
      create: p,
    });
  }
  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: { libelle: s.libelle, actif: true },
      create: s,
    });
  }

  for (const offre of offres) {
    const created = await prisma.offreService.upsert({
      where: { codePays_codeService: { codePays: offre.pays, codeService: offre.service } },
      update: {
        texteExplicatif: offre.texte,
        etapesParcours: JSON.stringify(offre.etapes),
        actif: true,
      },
      create: {
        codePays: offre.pays,
        codeService: offre.service,
        texteExplicatif: offre.texte,
        etapesParcours: JSON.stringify(offre.etapes),
        pieces: { create: offre.pieces },
        formulaire: {
          create: {
            code: `${offre.service}-${offre.pays}`,
            version: "1.0",
            champs: {
              create: offre.champs.map((c) => ({
                code: c.code,
                typeSaisie: c.typeSaisie,
                obligatoire: c.obligatoire,
                ordre: c.ordre,
                libelle: c.libelle,
                aide: c.aide,
                optionsJson: c.options ? JSON.stringify(c.options) : null,
                conditionChamp: c.conditionChamp,
                conditionOp: c.conditionOp,
                conditionValeur: c.conditionValeur,
                prefillDepuis: c.prefillDepuis,
              })),
            },
          },
        },
      },
    });

    const formulaire = await prisma.formulaire.findFirst({ where: { idOffre: created.id } });
    if (!formulaire) {
      await prisma.formulaire.create({
        data: {
          idOffre: created.id,
          code: `${offre.service}-${offre.pays}`,
          version: "1.0",
          champs: {
            create: offre.champs.map((c) => ({
              code: c.code,
              typeSaisie: c.typeSaisie,
              obligatoire: c.obligatoire,
              ordre: c.ordre,
              libelle: c.libelle,
              aide: c.aide,
              optionsJson: c.options ? JSON.stringify(c.options) : null,
              conditionChamp: c.conditionChamp,
              conditionOp: c.conditionOp,
              conditionValeur: c.conditionValeur,
              prefillDepuis: c.prefillDepuis,
            })),
          },
        },
      });
    }

    const piecesExistantes = await prisma.pieceRequise.count({ where: { idOffre: created.id } });
    if (piecesExistantes === 0) {
      await prisma.pieceRequise.createMany({
        data: offre.pieces.map((piece) => ({ ...piece, idOffre: created.id })),
      });
    }

    const prix = prixOffre(created.codeService);
    const bareme = await prisma.baremeTarifaire.findFirst({
      where: { idOffre: created.id, version: "2026.1" },
    });
    if (!bareme) {
      await prisma.baremeTarifaire.create({
        data: { idOffre: created.id, version: "2026.1", montant: prix, frais: 900 },
      });
    }
    console.log("Offre", created.codeService, created.codePays, prix);
  }
}

async function assurerCompte(params: {
  email: string;
  typeCompte: string;
  role: string;
  nom: string;
  prenom: string;
  motDePasseHash: string;
  idPartenaire?: string;
}) {
  const existant = await prisma.utilisateur.findUnique({ where: { email: params.email } });
  if (existant) {
    await prisma.utilisateur.update({
      where: { email: params.email },
      data: {
        typeCompte: params.typeCompte,
        role: params.role,
        idPartenaire: params.idPartenaire,
        statut: "actif",
      },
    });
    await prisma.profilCandidat.upsert({
      where: { idUtilisateur: existant.id },
      update: { nom: params.nom, prenom: params.prenom },
      create: { idUtilisateur: existant.id, nom: params.nom, prenom: params.prenom },
    });
    return;
  }
  await prisma.utilisateur.create({
    data: {
      email: params.email,
      motDePasseHash: params.motDePasseHash,
      typeCompte: params.typeCompte,
      role: params.role,
      idPartenaire: params.idPartenaire,
      profil: { create: { nom: params.nom, prenom: params.prenom } },
    },
  });
}

async function assurerComptesDemo() {
  const motDePasseHash = await hash("Demo2026!", 10);
  await assurerCompte({
    email: "candidat.demo@avi.test",
    typeCompte: "candidat",
    role: "",
    nom: "Démo",
    prenom: "Candidat",
    motDePasseHash,
  });
  console.log("Compte démo candidat.demo@avi.test");

  for (const staff of [
    { email: "conseiller.demo@avi.test", role: "conseiller", nom: "Martin", prenom: "Claire" },
    { email: "signataire.demo@avi.test", role: "signataire", nom: "Morel", prenom: "Julien" },
  ]) {
    await assurerCompte({
      email: staff.email,
      typeCompte: "collaborateur",
      role: staff.role,
      nom: staff.nom,
      prenom: staff.prenom,
      motDePasseHash,
    });
    console.log("Compte équipe", staff.email);
  }

  let partenaire = await prisma.partenaire.findFirst({ where: { nom: "Campus Horizon" } });
  if (!partenaire) {
    partenaire = await prisma.partenaire.create({
      data: { nom: "Campus Horizon", type: "agence", statut: "actif" },
    });
  }
  const regle = await prisma.regleCommission.findFirst({ where: { idPartenaire: partenaire.id } });
  if (!regle) {
    await prisma.regleCommission.create({
      data: { idPartenaire: partenaire.id, taux: 12, montantFixe: 0, dateDebut: "2026-01-01" },
    });
  }
  await assurerCompte({
    email: "partenaire.demo@avi.test",
    typeCompte: "partenaire",
    role: "apporteur",
    nom: "Fall",
    prenom: "Karim",
    motDePasseHash,
    idPartenaire: partenaire.id,
  });
  console.log("Compte partenaire partenaire.demo@avi.test");
}

async function main() {
  if (process.env.SEED_RESET === "1") {
    if (estPostgres()) {
      throw new Error("SEED_RESET est interdit sur Postgres / production : les dossiers clients seraient effacés.");
    }
    await prisma.justificatifVol.deleteMany();
    await prisma.passagerVol.deleteMany();
    await prisma.segmentVol.deleteMany();
    await prisma.reservationVol.deleteMany();
    await prisma.policeAssurance.deleteMany();
    await prisma.garantieFormule.deleteMany();
    await prisma.affectation.deleteMany();
    await prisma.listeAttente.deleteMany();
    await prisma.matching.deleteMany();
    await prisma.operationFinanciere.deleteMany();
    await prisma.pieceComptable.deleteMany();
    await prisma.demandeRemboursement.deleteMany();
    await prisma.espaceFinancier.deleteMany();
    await prisma.tarifApplique.deleteMany();
    await prisma.baremeTarifaire.deleteMany();
    await prisma.itemChecklist.deleteMany();
    await prisma.reponseFormulaire.deleteMany();
    await prisma.demande.deleteMany();
    await prisma.champFormulaire.deleteMany();
    await prisma.formulaire.deleteMany();
    await prisma.pieceRequise.deleteMany();
    await prisma.offreService.deleteMany();
    await prisma.pays.deleteMany();
    await prisma.service.deleteMany();
    await prisma.profilCandidat.deleteMany();
    await prisma.utilisateur.deleteMany();
  }

  await assurerCatalogue();
  await assurerComptesDemo();

  const fichierCode = process.env.CODE_ACCES_FICHIER;
  const codeRoles = await assurerCodeAccesRoles(prisma);
  if (codeRoles.cree) {
    console.log("CODE ACCES ROLES (PD + vous uniquement):", codeRoles.brut);
    console.log("Code écrit dans", codeRoles.fichier);
  } else if (fichierCode && !existsSync(fichierCode)) {
    const nouveau = await renouvelerCodeAccesRoles(prisma);
    console.log("CODE ACCES ROLES (fichier absent, renouvelé):", nouveau.brut);
    console.log("Code écrit dans", nouveau.fichier);
  } else {
    console.log("Code d’accès rôles déjà en place (non réaffiché).");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
