import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { htmlDocumentFinal, nouveauCodeVerification } from "../src/lib/avi-document.ts";
import { hashBuffer } from "../src/lib/ocr.ts";

const prisma = new PrismaClient();
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

const champs = {
  nom: "EONE",
  prenom: "EONE ALAIN RUSCONI",
  date_naissance: "2005-08-13",
  telephone: "+237 690000002",
  email: "candidat.demo@avi.test",
  adresse: "Bruxelles / Douala",
  garant_financier: "Emmanuel BOUGNA",
  etablissement: "UCLouvain",
  date_rentree: "2026-09-01",
  montant_avi: "12744",
};

const candidat = await prisma.utilisateur.findUnique({ where: { email: "candidat.demo@avi.test" } });
const controleur = await prisma.utilisateur.findUnique({ where: { email: "conseiller.demo@avi.test" } });
const admin = await prisma.utilisateur.findUnique({ where: { email: "signataire.demo@avi.test" } });
if (!candidat || !controleur || !admin) throw new Error("comptes démo manquants");

const offre = await prisma.offreService.findUnique({
  where: { codePays_codeService: { codePays: "BE", codeService: "AVI" } },
  include: { pieces: true, formulaire: { include: { champs: true } }, pays: true, service: true },
});
if (!offre?.formulaire) throw new Error("offre AVI BE introuvable");

const n = await prisma.demande.count({ where: { reference: { startsWith: "AVI-BE-2026-" } } });
const reference = `AVI-BE-2026-${String(n + 1).padStart(5, "0")}`;

const demande = await prisma.demande.create({
  data: {
    reference,
    idUtilisateur: candidat.id,
    idOffre: offre.id,
    statut: "en_traitement",
    etapeCourante: "validation",
    pourcentageAvancement: 90,
  },
});

for (const champ of offre.formulaire.champs) {
  const valeur = champs[champ.code];
  if (valeur == null) continue;
  await prisma.reponseFormulaire.create({ data: { idDemande: demande.id, idChamp: champ.id, valeur } });
}

const dir = path.join(process.cwd(), "storage", "uploads");
mkdirSync(dir, { recursive: true });
for (const piece of offre.pieces) {
  const filename = `${reference}-${piece.typePiece}.jpg`;
  writeFileSync(path.join(dir, filename), jpeg);
  await prisma.document.create({
    data: {
      idDemande: demande.id,
      idPieceRequise: piece.id,
      idAuteur: candidat.id,
      type: "transmis",
      nom: piece.libelle,
      format: "image/jpeg",
      storagePath: filename,
      hash: `test-be-${piece.typePiece}`,
      statut: "conforme",
      origine: "candidat",
    },
  });
}

const bareme = await prisma.baremeTarifaire.findFirst({ where: { idOffre: offre.id } });
const attendu = (bareme?.montant ?? 14900) + (bareme?.frais ?? 900);
await prisma.espaceFinancier.create({
  data: {
    idDemande: demande.id,
    montantAttendu: attendu,
    montantRecu: 1274400,
    frais: bareme?.frais ?? 900,
    statutFonds: "fonds_recus",
  },
});

await prisma.doubleValidation.create({
  data: {
    idDemande: demande.id,
    typeOperation: "signature",
    idVerificateur: controleur.id,
    statut: "verifie",
  },
});

const dossier = await prisma.demande.findUnique({
  where: { id: demande.id },
  include: {
    reponses: { include: { champ: true } },
    documents: { include: { piece: true } },
    offre: { include: { pays: true, service: true } },
    utilisateur: { include: { profil: true } },
    espaceFinancier: { include: { operations: true } },
  },
});

const codeVerification = nouveauCodeVerification();
const html = await htmlDocumentFinal({
  dossier,
  signataire: "Julien Morel",
  codeVerification,
});
const filename = `${reference}-final-${Date.now()}.html`;
writeFileSync(path.join(dir, filename), html);

const doc = await prisma.document.create({
  data: {
    idDemande: demande.id,
    idAuteur: admin.id,
    type: "genere",
    nom: `Dossier final ${reference}`,
    format: "text/html",
    storagePath: filename,
    hash: hashBuffer(html),
    statut: "signe",
    origine: "systeme",
    ocrJson: JSON.stringify({ codeVerification }),
  },
});
await prisma.jetonVerification.create({
  data: { token: codeVerification, idDemande: demande.id, idDocument: doc.id },
});
await prisma.demande.update({
  where: { id: demande.id },
  data: { statut: "validee", etapeCourante: "validation", pourcentageAvancement: 100 },
});

console.log(JSON.stringify({ reference, demandeId: demande.id, documentId: doc.id, codeVerification, filename }, null, 2));
await prisma.$disconnect();
