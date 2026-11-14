import { writeFileSync, mkdirSync } from "fs";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const QRCode = require("qrcode");
const { readFileSync } = require("fs");

const logo = `data:image/png;base64,${readFileSync(path.join("public", "hcgf", "logo.png")).toString("base64")}`;
const url = "https://plateforme-avi.vercel.app/verifier/D221-9708-47C1";
const qr = await QRCode.toString(url, { type: "svg", margin: 0, width: 108, errorCorrectionLevel: "M" });

const { htmlDocumentFinal } = await import("../src/lib/avi-document.ts");

const base = {
  documents: [],
  utilisateur: {
    email: "martialtawembe@gmail.com",
    profil: { nom: "NDOUMBE", prenom: "Beride Felix", dateNaissance: "2006-01-09", adresse: "Douala" },
  },
  espaceFinancier: { montantRecu: 1200000, montantAttendu: 1200000, devise: "EUR", operations: [{ type: "recu", createdAt: new Date("2026-08-06") }] },
};

const out = path.join("tmp-avi-ref", "preview");
mkdirSync(out, { recursive: true });

const fr = await htmlDocumentFinal({
  dossier: {
    ...base,
    reference: "AVI-FR-202609-0012",
    offre: { codePays: "FR", codeService: "AVI", service: { libelle: "AVI" }, pays: { libelle: "France" } },
    reponses: [
      { valeur: "NDOUMBE", champ: { code: "nom", libelle: "Nom" } },
      { valeur: "Beride Felix", champ: { code: "prenom", libelle: "Prénom" } },
      { valeur: "2006-01-09", champ: { code: "date_naissance", libelle: "Naissance" } },
      { valeur: "Institut des Langues et du Management Interculturel et Stratégique", champ: { code: "etablissement", libelle: "Établissement" } },
      { valeur: "2026-09-01", champ: { code: "date_rentree", libelle: "Rentrée" } },
      { valeur: "12", champ: { code: "duree_mois", libelle: "Durée" } },
      { valeur: "12000", champ: { code: "montant_avi", libelle: "Montant" } },
    ],
  },
  signataire: "Octavia MBIAKOUP KONGUEP",
  codeVerification: "D221-9708-47C1",
  dateSignature: new Date("2026-09-30"),
});

const be = await htmlDocumentFinal({
  dossier: {
    ...base,
    reference: "AVI-BE-202609-0004",
    utilisateur: { email: "eone@example.com", profil: { nom: "EONE", prenom: "EONE ALAIN RUSCONI", dateNaissance: "2005-08-13" } },
    offre: { codePays: "BE", codeService: "AVI", service: { libelle: "AVI" }, pays: { libelle: "Belgique" } },
    reponses: [
      { valeur: "EONE", champ: { code: "nom", libelle: "Nom" } },
      { valeur: "EONE ALAIN RUSCONI", champ: { code: "prenom", libelle: "Prénom" } },
      { valeur: "2005-08-13", champ: { code: "date_naissance", libelle: "Naissance" } },
      { valeur: "Emmanuel BOUGNA", champ: { code: "garant_financier", libelle: "Garant" } },
      { valeur: "UCLouvain", champ: { code: "etablissement", libelle: "Établissement" } },
      { valeur: "2026-09-01", champ: { code: "date_rentree", libelle: "Rentrée" } },
      { valeur: "12744", champ: { code: "montant_avi", libelle: "Montant" } },
    ],
    espaceFinancier: { montantRecu: 1274400, montantAttendu: 1274400, devise: "EUR", operations: [] },
  },
  signataire: "Octavia MBIAKOUP KONGUEP",
  codeVerification: "B814-22C1-90AA",
  dateSignature: new Date("2026-09-15"),
});

const de = await htmlDocumentFinal({
  dossier: {
    ...base,
    reference: "HCGF-SPK-202608-0001",
    utilisateur: { email: "martialtawembe@gmail.com", profil: { nom: "TAWEMBE SANDIO", prenom: "MARTIAL HERVE", dateNaissance: "1998-05-05" } },
    offre: { codePays: "DE", codeService: "AVI", service: { libelle: "AVI" }, pays: { libelle: "Allemagne" } },
    reponses: [
      { valeur: "TAWEMBE SANDIO", champ: { code: "nom", libelle: "Nom" } },
      { valeur: "MARTIAL HERVE", champ: { code: "prenom", libelle: "Prénom" } },
      { valeur: "1998-05-05", champ: { code: "date_naissance", libelle: "Naissance" } },
      { valeur: "Nkongsamba, Cameroun", champ: { code: "lieu_naissance", libelle: "Lieu" } },
      { valeur: "Camerounaise", champ: { code: "nationalite", libelle: "Nationalité" } },
      { valeur: "AA708997", champ: { code: "numero_passeport", libelle: "Passeport" } },
      { valeur: "martialtawembe@gmail.com", champ: { code: "email", libelle: "Email" } },
      { valeur: "12063", champ: { code: "montant_avi", libelle: "Montant" } },
    ],
    espaceFinancier: { montantRecu: 1206300, montantAttendu: 1206300, devise: "EUR", operations: [{ type: "recu", createdAt: new Date("2026-08-06") }] },
  },
  signataire: "Octavia MBIAKOUP KONGUEP",
  codeVerification: "32EC-C2FF-639B",
  dateSignature: new Date("2026-08-10T10:48:00"),
});

const itReponses = [
  { valeur: "NDOUMBE", champ: { code: "nom", libelle: "Nom" } },
  { valeur: "Beride Felix", champ: { code: "prenom", libelle: "Prénom" } },
  { valeur: "2006-01-09", champ: { code: "date_naissance", libelle: "Naissance" } },
  { valeur: "Camerounaise", champ: { code: "nationalite", libelle: "Nationalité" } },
  { valeur: "AA1234567", champ: { code: "numero_passeport", libelle: "Passeport" } },
  { valeur: "Università di Bologna", champ: { code: "etablissement", libelle: "Établissement" } },
  { valeur: "Laurea in Economia", champ: { code: "formation", libelle: "Formation" } },
  { valeur: "2026-09-01", champ: { code: "date_rentree", libelle: "Rentrée" } },
  { valeur: "12", champ: { code: "duree_mois", libelle: "Durée" } },
  { valeur: "6961", champ: { code: "montant_avi", libelle: "Montant" } },
];

const itAvec = await htmlDocumentFinal({
  dossier: {
    ...base,
    reference: "AVI-IT-2026-00001",
    offre: { codePays: "IT", codeService: "AVI", service: { libelle: "AVI" }, pays: { libelle: "Italie" } },
    reponses: [...itReponses, { valeur: "Emmanuel BOUGNA", champ: { code: "garant_financier", libelle: "Garant" } }],
    espaceFinancier: { montantRecu: 696100, montantAttendu: 696100, devise: "EUR", operations: [{ type: "recu", createdAt: new Date("2026-09-10") }] },
  },
  signataire: "Octavie MBIAKOUP KONGUEP",
  codeVerification: "IT14-A8C2-91B0",
  dateSignature: new Date("2026-09-15"),
});

const itSans = await htmlDocumentFinal({
  dossier: {
    ...base,
    reference: "AVI-IT-2026-00002",
    offre: { codePays: "IT", codeService: "AVI", service: { libelle: "AVI" }, pays: { libelle: "Italie" } },
    reponses: itReponses,
    espaceFinancier: { montantRecu: 696100, montantAttendu: 696100, devise: "EUR", operations: [{ type: "recu", createdAt: new Date("2026-09-10") }] },
  },
  signataire: "Octavie MBIAKOUP KONGUEP",
  codeVerification: "IT15-B9D3-02C1",
  dateSignature: new Date("2026-09-15"),
});

writeFileSync(path.join(out, "FR.html"), fr);
writeFileSync(path.join(out, "BE.html"), be);
writeFileSync(path.join(out, "DE.html"), de);
writeFileSync(path.join(out, "IT-avec-garant.html"), itAvec);
writeFileSync(path.join(out, "IT-sans-garant.html"), itSans);
console.log("ok", qr.length, logo.length);
