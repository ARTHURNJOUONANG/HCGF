import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const DEMANDE_ID = "cmvlb4w9o000cts4o2u6mvybs";
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

const champs = {
  nom: "Démo",
  prenom: "Candidat",
  date_naissance: "2006-01-09",
  telephone: "+237 690000001",
  email: "candidat.demo@avi.test",
  adresse: "12 rue des Études, Douala",
  etablissement: "Institut des Langues et du Management Interculturel et Stratégique",
  date_rentree: "2026-09-01",
  duree_mois: "12",
  montant_avi: "12000",
};

const demande = await prisma.demande.findUnique({
  where: { id: DEMANDE_ID },
  include: { offre: { include: { pieces: true, formulaire: { include: { champs: true } } } } },
});
if (!demande) throw new Error("demande introuvable");

for (const champ of demande.offre.formulaire?.champs ?? []) {
  const valeur = champs[champ.code];
  if (valeur == null) continue;
  const exist = await prisma.reponseFormulaire.findFirst({
    where: { idDemande: demande.id, idChamp: champ.id },
  });
  if (exist) await prisma.reponseFormulaire.update({ where: { id: exist.id }, data: { valeur } });
  else await prisma.reponseFormulaire.create({ data: { idDemande: demande.id, idChamp: champ.id, valeur } });
}

const dir = path.join(process.cwd(), "storage", "uploads");
mkdirSync(dir, { recursive: true });

const auteur = await prisma.utilisateur.findUnique({ where: { email: "candidat.demo@avi.test" } });
const controleur = await prisma.utilisateur.findUnique({ where: { email: "conseiller.demo@avi.test" } });
if (!auteur || !controleur) throw new Error("comptes démo manquants");

for (const piece of demande.offre.pieces) {
  const deja = await prisma.document.findFirst({
    where: { idDemande: demande.id, idPieceRequise: piece.id },
  });
  if (deja) {
    await prisma.document.update({ where: { id: deja.id }, data: { statut: "conforme" } });
    continue;
  }
  const filename = `${demande.reference}-${piece.typePiece}.jpg`;
  writeFileSync(path.join(dir, filename), jpeg);
  await prisma.document.create({
    data: {
      idDemande: demande.id,
      idPieceRequise: piece.id,
      idAuteur: auteur.id,
      type: "transmis",
      nom: piece.libelle,
      format: "image/jpeg",
      storagePath: filename,
      hash: `test-${piece.typePiece}`,
      statut: "conforme",
      origine: "candidat",
    },
  });
}

const finance = await prisma.espaceFinancier.findUnique({ where: { idDemande: demande.id } });
if (finance) {
  await prisma.espaceFinancier.update({
    where: { idDemande: demande.id },
    data: { statutFonds: "fonds_recus", montantRecu: finance.montantAttendu || 1200000 },
  });
} else {
  await prisma.espaceFinancier.create({
    data: {
      idDemande: demande.id,
      montantAttendu: 1200000,
      montantRecu: 1200000,
      frais: 0,
      statutFonds: "fonds_recus",
    },
  });
}

await prisma.doubleValidation.create({
  data: {
    idDemande: demande.id,
    typeOperation: "signature",
    idVerificateur: controleur.id,
    statut: "verifie",
  },
});

await prisma.demande.update({
  where: { id: demande.id },
  data: { statut: "en_traitement", etapeCourante: "validation", pourcentageAvancement: 90, controleRenforce: false },
});

console.log("pret", demande.reference, demande.id);
await prisma.$disconnect();
