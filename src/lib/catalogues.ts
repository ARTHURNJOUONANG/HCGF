import { prisma } from "./prisma";
import { codeIata } from "./aeroports";

export const FORMULES = [
  {
    code: "essentielle",
    libelle: "Essentielle",
    description: "Frais médicaux, rapatriement, responsabilité civile.",
    supplement: 0,
    garanties: [
      ["MED", "Frais médicaux", "30 000 €"],
      ["RAP", "Rapatriement", "Illimité"],
      ["RC", "Responsabilité civile", "100 000 €"],
    ],
  },
  {
    code: "confort",
    libelle: "Confort",
    description: "Essentielle + bagages, interruption de séjour.",
    supplement: 4000,
    garanties: [
      ["MED", "Frais médicaux", "80 000 €"],
      ["RAP", "Rapatriement", "Illimité"],
      ["RC", "Responsabilité civile", "300 000 €"],
      ["BAG", "Bagages", "1 500 €"],
    ],
  },
  {
    code: "premium",
    libelle: "Premium",
    description: "Confort + sports, assistance 24/7, capital décès.",
    supplement: 9000,
    garanties: [
      ["MED", "Frais médicaux", "150 000 €"],
      ["RAP", "Rapatriement", "Illimité"],
      ["RC", "Responsabilité civile", "500 000 €"],
      ["BAG", "Bagages", "3 000 €"],
      ["SPORT", "Sports d’hiver / loisirs", "Inclus"],
    ],
  },
] as const;

export async function assurerCatalogueAssurance() {
  for (const formule of FORMULES) {
    const created = await prisma.formuleAssurance.upsert({
      where: { code: formule.code },
      update: { libelle: formule.libelle, description: formule.description, supplement: formule.supplement },
      create: {
        code: formule.code,
        libelle: formule.libelle,
        description: formule.description,
        supplement: formule.supplement,
      },
    });
    for (const [code, libelle, plafond] of formule.garanties) {
      const garantie = await prisma.garantie.upsert({
        where: { code },
        update: { libelle, plafond },
        create: { code, libelle, plafond },
      });
      await prisma.garantieFormule.upsert({
        where: { idFormule_idGarantie: { idFormule: created.id, idGarantie: garantie.id } },
        update: {},
        create: { idFormule: created.id, idGarantie: garantie.id },
      });
    }
  }
}

const ETABS = [
  { id: "sorbonne", nom: "Sorbonne Université", ville: "Paris", adresse: "21 rue de l’École de médecine, 75006 Paris" },
  { id: "dauphine", nom: "Université Paris Dauphine", ville: "Paris", adresse: "Place du Maréchal de Lattre de Tassigny, 75016 Paris" },
  { id: "lyon2", nom: "Université Lumière Lyon 2", ville: "Lyon", adresse: "86 rue Pasteur, 69007 Lyon" },
];

const LOGEMENTS = [
  { id: "lg-latin", titre: "Studio Quartier Latin", adresse: "12 rue des Écoles, 75005 Paris", ville: "Paris", type: "studio", capacite: 1, bailleur: "Résidences Campus Est" },
  { id: "lg-nation", titre: "Colocation Nation", adresse: "8 avenue du Trône, 75012 Paris", ville: "Paris", type: "colocation", capacite: 2, bailleur: "Résidences Campus Est" },
  { id: "lg-creteil", titre: "T1 Créteil", adresse: "3 rue des Archives, 94000 Créteil", ville: "Créteil", type: "T1", capacite: 1, bailleur: "Habitat Île-de-France" },
  { id: "lg-lyon", titre: "Studio Guillotière", adresse: "20 cours Gambetta, 69007 Lyon", ville: "Lyon", type: "studio", capacite: 1, bailleur: "Lyon Études" },
];

/** Temps transport en commun (min) — pas à vol d’oiseau. */
const TRAJETS: Record<string, Record<string, { transport: number; voiture: number }>> = {
  sorbonne: {
    "lg-latin": { transport: 12, voiture: 8 },
    "lg-nation": { transport: 28, voiture: 22 },
    "lg-creteil": { transport: 52, voiture: 35 },
    "lg-lyon": { transport: 120, voiture: 95 },
  },
  dauphine: {
    "lg-latin": { transport: 34, voiture: 24 },
    "lg-nation": { transport: 38, voiture: 28 },
    "lg-creteil": { transport: 48, voiture: 32 },
    "lg-lyon": { transport: 120, voiture: 95 },
  },
  lyon2: {
    "lg-latin": { transport: 120, voiture: 95 },
    "lg-nation": { transport: 120, voiture: 95 },
    "lg-creteil": { transport: 120, voiture: 95 },
    "lg-lyon": { transport: 14, voiture: 9 },
  },
};

export async function assurerCatalogueLogement() {
  const bailleurs = new Map<string, string>();
  for (const nom of [...new Set(LOGEMENTS.map((l) => l.bailleur))]) {
    const existing = await prisma.bailleur.findFirst({ where: { nom } });
    const row =
      existing ??
      (await prisma.bailleur.create({
        data: { nom, coordonnees: "masqué jusqu’à affectation", statutValidation: "valide" },
      }));
    bailleurs.set(nom, row.id);
  }

  for (const e of ETABS) {
    await prisma.etablissement.upsert({
      where: { id: e.id },
      update: { nom: e.nom, ville: e.ville, adresse: e.adresse },
      create: e,
    });
  }

  for (const l of LOGEMENTS) {
    await prisma.logement.upsert({
      where: { id: l.id },
      update: { titre: l.titre, adresse: l.adresse, ville: l.ville, type: l.type, capacite: l.capacite },
      create: {
        id: l.id,
        idBailleur: bailleurs.get(l.bailleur)!,
        titre: l.titre,
        adresse: l.adresse,
        ville: l.ville,
        type: l.type,
        capacite: l.capacite,
        dateDisponibilite: "2026-09-01",
      },
    });
  }

  for (const [idEtab, trajets] of Object.entries(TRAJETS)) {
    for (const [idLogement, t] of Object.entries(trajets)) {
      const statut = t.transport <= 40 ? "COMPATIBLE" : "NON_COMPATIBLE";
      await prisma.matching.upsert({
        where: { idEtablissement_idLogement: { idEtablissement: idEtab, idLogement } },
        update: { dureeTransportMin: t.transport, dureeVoitureMin: t.voiture, statut },
        create: {
          idEtablissement: idEtab,
          idLogement,
          dureeTransportMin: t.transport,
          dureeVoitureMin: t.voiture,
          statut,
        },
      });
    }
  }
}

export function trouverEtablissement(nomSaisi: string) {
  const n = nomSaisi.trim().toLowerCase();
  if (!n) return null;
  if (n.includes("dauphine")) return "dauphine";
  if (n.includes("lyon")) return "lyon2";
  if (n.includes("sorbonne")) return "sorbonne";
  return null;
}

export type OffreVol = {
  code: string;
  from: string;
  to: string;
  fromNom: string;
  toNom: string;
  airline: string;
  depart: string;
  arrivee: string;
  retourDepart?: string;
  retourArrivee?: string;
  prix: number;
  hold: boolean;
  garantieHeures: number;
  /** IDs passagers Duffel (offer_request) — requis pour un Hold live. */
  passengerIds?: string[];
  currency?: string;
  paymentRequiredBy?: string | null;
};

export const OFFRES_VOL: OffreVol[] = [
  // Europe / Canada (intra)
  { code: "CDG-FRA-1", from: "CDG", to: "FRA", fromNom: "Paris CDG", toNom: "Francfort", airline: "Lufthansa", depart: "08:15", arrivee: "09:45", prix: 18900, hold: true, garantieHeures: 48 },
  { code: "CDG-BER-1", from: "CDG", to: "BER", fromNom: "Paris CDG", toNom: "Berlin", airline: "Air France", depart: "11:40", arrivee: "13:25", prix: 16400, hold: true, garantieHeures: 72 },
  { code: "ORY-BRU-1", from: "ORY", to: "BRU", fromNom: "Paris Orly", toNom: "Bruxelles", airline: "Brussels Airlines", depart: "07:05", arrivee: "08:10", prix: 9800, hold: true, garantieHeures: 36 },
  { code: "CDG-YUL-1", from: "CDG", to: "YUL", fromNom: "Paris CDG", toNom: "Montréal", airline: "Air Canada", depart: "13:20", arrivee: "15:55", prix: 54200, hold: true, garantieHeures: 24 },
  { code: "BRU-YUL-1", from: "BRU", to: "YUL", fromNom: "Bruxelles", toNom: "Montréal", airline: "Air Canada", depart: "12:10", arrivee: "14:05", prix: 49800, hold: true, garantieHeures: 24 },
  { code: "FRA-YUL-1", from: "FRA", to: "YUL", fromNom: "Francfort", toNom: "Montréal", airline: "Lufthansa", depart: "10:30", arrivee: "12:40", prix: 56100, hold: true, garantieHeures: 24 },
  { code: "LYS-FRA-1", from: "LYS", to: "FRA", fromNom: "Lyon", toNom: "Francfort", airline: "Lufthansa", depart: "06:50", arrivee: "08:10", prix: 12100, hold: false, garantieHeures: 0 },
  { code: "CDG-AMS-1", from: "CDG", to: "AMS", fromNom: "Paris CDG", toNom: "Amsterdam", airline: "KLM", depart: "09:30", arrivee: "10:50", prix: 11200, hold: true, garantieHeures: 48 },
  // Afrique → France
  { code: "DLA-CDG-1", from: "DLA", to: "CDG", fromNom: "Douala", toNom: "Paris CDG", airline: "Air France", depart: "22:40", arrivee: "06:15", prix: 68900, hold: true, garantieHeures: 48 },
  { code: "NSI-CDG-1", from: "NSI", to: "CDG", fromNom: "Yaoundé", toNom: "Paris CDG", airline: "Air France", depart: "21:55", arrivee: "06:05", prix: 71200, hold: true, garantieHeures: 48 },
  { code: "ABJ-CDG-1", from: "ABJ", to: "CDG", fromNom: "Abidjan", toNom: "Paris CDG", airline: "Air France", depart: "23:10", arrivee: "07:20", prix: 64500, hold: true, garantieHeures: 48 },
  { code: "DSS-CDG-1", from: "DSS", to: "CDG", fromNom: "Dakar", toNom: "Paris CDG", airline: "Air France", depart: "23:55", arrivee: "06:40", prix: 59800, hold: true, garantieHeures: 36 },
  { code: "CMN-CDG-1", from: "CMN", to: "CDG", fromNom: "Casablanca", toNom: "Paris CDG", airline: "Royal Air Maroc", depart: "10:15", arrivee: "13:55", prix: 28900, hold: true, garantieHeures: 48 },
  { code: "ALG-CDG-1", from: "ALG", to: "CDG", fromNom: "Alger", toNom: "Paris CDG", airline: "Air Algérie", depart: "08:00", arrivee: "11:10", prix: 24600, hold: true, garantieHeures: 36 },
  { code: "TUN-ORY-1", from: "TUN", to: "ORY", fromNom: "Tunis", toNom: "Paris Orly", airline: "Tunisair", depart: "09:30", arrivee: "12:45", prix: 22100, hold: true, garantieHeures: 36 },
  { code: "LBV-CDG-1", from: "LBV", to: "CDG", fromNom: "Libreville", toNom: "Paris CDG", airline: "Air France", depart: "21:20", arrivee: "05:50", prix: 70200, hold: true, garantieHeures: 48 },
  // Afrique → Belgique
  { code: "DLA-BRU-1", from: "DLA", to: "BRU", fromNom: "Douala", toNom: "Bruxelles", airline: "Brussels Airlines", depart: "22:15", arrivee: "06:05", prix: 65400, hold: true, garantieHeures: 48 },
  { code: "ABJ-BRU-1", from: "ABJ", to: "BRU", fromNom: "Abidjan", toNom: "Bruxelles", airline: "Brussels Airlines", depart: "23:05", arrivee: "06:40", prix: 62100, hold: true, garantieHeures: 48 },
  { code: "DSS-BRU-1", from: "DSS", to: "BRU", fromNom: "Dakar", toNom: "Bruxelles", airline: "Brussels Airlines", depart: "22:50", arrivee: "06:20", prix: 57800, hold: true, garantieHeures: 36 },
  { code: "FIH-BRU-1", from: "FIH", to: "BRU", fromNom: "Kinshasa", toNom: "Bruxelles", airline: "Brussels Airlines", depart: "21:40", arrivee: "06:55", prix: 73500, hold: true, garantieHeures: 48 },
  // Afrique → Allemagne
  { code: "ADD-FRA-1", from: "ADD", to: "FRA", fromNom: "Addis-Abeba", toNom: "Francfort", airline: "Ethiopian Airlines", depart: "00:30", arrivee: "06:45", prix: 61200, hold: true, garantieHeures: 48 },
  { code: "NBO-FRA-1", from: "NBO", to: "FRA", fromNom: "Nairobi", toNom: "Francfort", airline: "Lufthansa", depart: "23:40", arrivee: "06:10", prix: 66800, hold: true, garantieHeures: 48 },
  { code: "CAI-FRA-1", from: "CAI", to: "FRA", fromNom: "Le Caire", toNom: "Francfort", airline: "EgyptAir", depart: "14:20", arrivee: "18:35", prix: 35400, hold: true, garantieHeures: 36 },
  { code: "CMN-FRA-1", from: "CMN", to: "FRA", fromNom: "Casablanca", toNom: "Francfort", airline: "Royal Air Maroc", depart: "11:05", arrivee: "15:40", prix: 31200, hold: true, garantieHeures: 36 },
  // Afrique → Canada (souvent via Europe — démo directe)
  { code: "DLA-YUL-1", from: "DLA", to: "YUL", fromNom: "Douala", toNom: "Montréal", airline: "Air Canada", depart: "20:00", arrivee: "08:30", prix: 98500, hold: true, garantieHeures: 24 },
  { code: "CMN-YUL-1", from: "CMN", to: "YUL", fromNom: "Casablanca", toNom: "Montréal", airline: "Air Canada", depart: "12:45", arrivee: "16:20", prix: 72400, hold: true, garantieHeures: 24 },
  { code: "DSS-YUL-1", from: "DSS", to: "YUL", fromNom: "Dakar", toNom: "Montréal", airline: "Air Canada", depart: "13:10", arrivee: "17:05", prix: 81200, hold: true, garantieHeures: 24 },
  // Retours Europe/Canada → Afrique (séjours / vacances)
  { code: "CDG-DLA-1", from: "CDG", to: "DLA", fromNom: "Paris CDG", toNom: "Douala", airline: "Air France", depart: "15:20", arrivee: "21:55", prix: 67500, hold: true, garantieHeures: 48 },
  { code: "BRU-DLA-1", from: "BRU", to: "DLA", fromNom: "Bruxelles", toNom: "Douala", airline: "Brussels Airlines", depart: "14:50", arrivee: "21:30", prix: 64900, hold: true, garantieHeures: 48 },
  { code: "YUL-CMN-1", from: "YUL", to: "CMN", fromNom: "Montréal", toNom: "Casablanca", airline: "Air Canada", depart: "18:40", arrivee: "06:15", prix: 69800, hold: true, garantieHeures: 24 },
];

export function aeroportPays(codePays: string) {
  if (codePays === "DE") return "FRA";
  if (codePays === "BE") return "BRU";
  if (codePays === "CA") return "YUL";
  return "CDG";
}

export function chercherVols(depart: string, arrivee: string) {
  const d = codeIata(depart);
  const a = codeIata(arrivee);
  const depTxt = (depart || "").toUpperCase();
  const arrTxt = (arrivee || "").toUpperCase();
  const filtrés = OFFRES_VOL.filter((o) => {
    const okD = !d || o.from === d || o.fromNom.toUpperCase().includes(depTxt);
    const okA = !a || o.to === a || o.toNom.toUpperCase().includes(arrTxt);
    return okD && okA;
  });
  if (filtrés.length > 0) return filtrés;
  const liees = OFFRES_VOL.filter(
    (o) => (d && (o.from === d || o.to === d)) || (a && (o.from === a || o.to === a)),
  );
  return liees.length > 0 ? liees.slice(0, 8) : OFFRES_VOL.filter((o) => o.hold).slice(0, 6);
}

export function libelleStatutVol(statut: string) {
  const labels: Record<string, string> = {
    SEARCHED: "Recherché",
    HOLD_PENDING: "Hold en cours",
    HELD: "Hold confirmé",
    EXPIRING_SOON: "Expire bientôt",
    EXPIRED: "Expiré",
    CANCELLED: "Annulé",
    TICKETED: "Billet émis",
    ERROR: "Erreur",
  };
  return labels[statut] ?? statut;
}
