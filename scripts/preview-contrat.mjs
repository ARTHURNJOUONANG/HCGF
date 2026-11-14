import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { htmlContratAvi } from "../src/lib/contrat-avi.ts";

const dossier = {
  reference: "AVI-FR-2026-00012",
  offre: { codePays: "FR", pays: { libelle: "France" } },
  utilisateur: {
    email: "etudiante@example.com",
    profil: { nom: "MBARGA", prenom: "Sandra", dateNaissance: "2000-11-27", telephone: "+237 698 366 293", adresse: "Yaoundé, Cameroun", nationalite: "Camerounaise" },
  },
  reponses: [
    { valeur: "MBARGA", champ: { code: "nom" } },
    { valeur: "Sandra", champ: { code: "prenom" } },
    { valeur: "2000-11-27", champ: { code: "date_naissance" } },
    { valeur: "Yaoundé", champ: { code: "lieu_naissance" } },
    { valeur: "Camerounaise", champ: { code: "nationalite" } },
    { valeur: "+237 698 366 293", champ: { code: "telephone" } },
    { valeur: "sandra.mbarga@example.com", champ: { code: "email" } },
    { valeur: "Yaoundé, Cameroun", champ: { code: "adresse" } },
    { valeur: "ESAM Paris", champ: { code: "etablissement" } },
    { valeur: "12", champ: { code: "duree_mois" } },
    { valeur: "10530", champ: { code: "montant_avi" } },
  ],
};

const html = htmlContratAvi({
  dossier,
  signature: {
    date: new Date("2026-10-23"),
    lieu: "Paris",
    nomSignataire: "MBARGA Sandra",
    preuve: "a1b2c3d4e5f6a7b8c9d0e1f2",
  },
});

const out = path.join("tmp-avi-ref", "preview");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "CONTRAT-FR.html"), html);
console.log("ok", html.length);
