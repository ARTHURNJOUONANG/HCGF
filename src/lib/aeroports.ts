/** Aéroports / villes — Afrique ↔ France, Allemagne, Belgique, Canada. */

export const AEROPORTS_CIBLE = {
  FR: [
    { code: "CDG", nom: "Paris CDG" },
    { code: "ORY", nom: "Paris Orly" },
    { code: "LYS", nom: "Lyon" },
    { code: "MRS", nom: "Marseille" },
  ],
  DE: [
    { code: "FRA", nom: "Francfort" },
    { code: "BER", nom: "Berlin" },
    { code: "MUC", nom: "Munich" },
  ],
  BE: [
    { code: "BRU", nom: "Bruxelles" },
  ],
  CA: [
    { code: "YUL", nom: "Montréal" },
    { code: "YYZ", nom: "Toronto" },
    { code: "YVR", nom: "Vancouver" },
  ],
} as const;

/** Hubs Afrique fréquemment reliés aux destinations d’études. */
export const AEROPORTS_AFRIQUE = [
  { code: "DLA", nom: "Douala", pays: "Cameroun" },
  { code: "NSI", nom: "Yaoundé", pays: "Cameroun" },
  { code: "ABJ", nom: "Abidjan", pays: "Côte d’Ivoire" },
  { code: "DSS", nom: "Dakar", pays: "Sénégal" },
  { code: "DKR", nom: "Dakar (Léopold Sédar Senghor)", pays: "Sénégal" },
  { code: "LOS", nom: "Lagos", pays: "Nigéria" },
  { code: "ACC", nom: "Accra", pays: "Ghana" },
  { code: "NBO", nom: "Nairobi", pays: "Kenya" },
  { code: "ADD", nom: "Addis-Abeba", pays: "Éthiopie" },
  { code: "CMN", nom: "Casablanca", pays: "Maroc" },
  { code: "RAK", nom: "Marrakech", pays: "Maroc" },
  { code: "ALG", nom: "Alger", pays: "Algérie" },
  { code: "TUN", nom: "Tunis", pays: "Tunisie" },
  { code: "CAI", nom: "Le Caire", pays: "Égypte" },
  { code: "LBV", nom: "Libreville", pays: "Gabon" },
  { code: "BZV", nom: "Brazzaville", pays: "Congo" },
  { code: "FIH", nom: "Kinshasa", pays: "RDC" },
  { code: "COO", nom: "Cotonou", pays: "Bénin" },
  { code: "LFW", nom: "Lomé", pays: "Togo" },
  { code: "OUA", nom: "Ouagadougou", pays: "Burkina Faso" },
  { code: "BKO", nom: "Bamako", pays: "Mali" },
  { code: "NIM", nom: "Niamey", pays: "Niger" },
  { code: "NDJ", nom: "N’Djamena", pays: "Tchad" },
  { code: "JNB", nom: "Johannesburg", pays: "Afrique du Sud" },
  { code: "CPT", nom: "Le Cap", pays: "Afrique du Sud" },
] as const;

const VILLES_VERS_IATA: Record<string, string> = {
  // France / Europe / Canada
  PARIS: "CDG",
  ORY: "ORY",
  CDG: "CDG",
  LYON: "LYS",
  MARSEILLE: "MRS",
  NICE: "NCE",
  TOULOUSE: "TLS",
  BORDEAUX: "BOD",
  FRANCFORT: "FRA",
  FRANKFURT: "FRA",
  BERLIN: "BER",
  MUNICH: "MUC",
  MÜNCHEN: "MUC",
  BRUXELLES: "BRU",
  BRUSSELS: "BRU",
  AMSTERDAM: "AMS",
  MONTREAL: "YUL",
  MONTRÉAL: "YUL",
  TORONTO: "YYZ",
  VANCOUVER: "YVR",
  LONDRES: "LHR",
  LONDON: "LHR",
  // Afrique
  DOUALA: "DLA",
  YAOUNDE: "NSI",
  YAOUNDÉ: "NSI",
  ABIDJAN: "ABJ",
  DAKAR: "DSS",
  LAGOS: "LOS",
  ACCRA: "ACC",
  NAIROBI: "NBO",
  ADDIS: "ADD",
  "ADDIS ABEBA": "ADD",
  "ADDIS-ABEBA": "ADD",
  CASABLANCA: "CMN",
  MARRAKECH: "RAK",
  ALGER: "ALG",
  ALGIERS: "ALG",
  TUNIS: "TUN",
  CAIRE: "CAI",
  CAIRO: "CAI",
  LIBREVILLE: "LBV",
  BRAZZAVILLE: "BZV",
  KINSHASA: "FIH",
  COTONOU: "COO",
  LOME: "LFW",
  LOMÉ: "LFW",
  OUAGADOUGOU: "OUA",
  BAMAKO: "BKO",
  NIAMEY: "NIM",
  NDJAMENA: "NDJ",
  "N'DJAMENA": "NDJ",
  JOHANNESBURG: "JNB",
  "LE CAP": "CPT",
  CAPETOWN: "CPT",
  CAMEROUN: "DLA",
  SENEGAL: "DSS",
  SÉNÉGAL: "DSS",
  MAROC: "CMN",
  ALGERIE: "ALG",
  ALGÉRIE: "ALG",
  TUNISIE: "TUN",
  EGYPTE: "CAI",
  ÉGYPTE: "CAI",
  GABON: "LBV",
  CONGO: "BZV",
  BENIN: "COO",
  BÉNIN: "COO",
  TOGO: "LFW",
  MALI: "BKO",
  NIGER: "NIM",
  TCHAD: "NDJ",
  KENYA: "NBO",
  ETHIOPIE: "ADD",
  ÉTHIOPIE: "ADD",
  GHANA: "ACC",
  NIGERIA: "LOS",
  NIGÉRIA: "LOS",
  "COTE D'IVOIRE": "ABJ",
  "CÔTE D'IVOIRE": "ABJ",
  IVOIRE: "ABJ",
};

export function codeIata(saisie: string, fallback = ""): string {
  const brut = (saisie || "").trim().toUpperCase();
  if (!brut) return fallback;
  const m = brut.match(/\b([A-Z]{3})\b/);
  if (m) return m[1];
  if (/^[A-Z]{3}$/.test(brut)) return brut;
  const normalise = brut.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [ville, code] of Object.entries(VILLES_VERS_IATA)) {
    const v = ville.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (brut.includes(ville) || normalise.includes(v)) return code;
  }
  return fallback || brut.slice(0, 3);
}

export function aeroportPays(codePays: string) {
  if (codePays === "DE") return "FRA";
  if (codePays === "BE") return "BRU";
  if (codePays === "CA") return "YUL";
  return "CDG";
}

export function suggestionsTrajetsVol(): { from: string; to: string; label: string }[] {
  return [
    { from: "DLA", to: "CDG", label: "Douala → Paris" },
    { from: "DLA", to: "BRU", label: "Douala → Bruxelles" },
    { from: "NSI", to: "CDG", label: "Yaoundé → Paris" },
    { from: "ABJ", to: "CDG", label: "Abidjan → Paris" },
    { from: "DSS", to: "CDG", label: "Dakar → Paris" },
    { from: "CMN", to: "CDG", label: "Casablanca → Paris" },
    { from: "ADD", to: "FRA", label: "Addis-Abeba → Francfort" },
    { from: "NBO", to: "AMS", label: "Nairobi → Amsterdam (corr. Europe)" },
    { from: "LOS", to: "LHR", label: "Lagos → Londres (corr. Europe)" },
    { from: "CDG", to: "YUL", label: "Paris → Montréal" },
    { from: "BRU", to: "YUL", label: "Bruxelles → Montréal" },
    { from: "DLA", to: "YUL", label: "Douala → Montréal" },
    { from: "CDG", to: "FRA", label: "Paris → Francfort" },
    { from: "CDG", to: "BER", label: "Paris → Berlin" },
  ];
}
