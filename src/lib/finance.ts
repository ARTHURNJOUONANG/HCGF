import { ibanPlateforme } from "./coordonnees";

export const IBAN_PLATEFORME = ibanPlateforme();

export function euros(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function jour(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}/${value("month")}/${value("year")}`;
}

export function libelleFonds(statut: string) {
  const labels: Record<string, string> = {
    en_attente: "En attente des fonds",
    partiel: "Paiement partiel",
    fonds_recus: "Fonds reçus",
    rembourse: "Remboursé",
  };
  return labels[statut] ?? statut;
}

export function libelleRemboursement(statut: string) {
  const labels: Record<string, string> = {
    recue: "Demande reçue",
    a_verifier: "À vérifier",
    validee: "Validée",
    en_cours: "En cours",
    remboursee: "Remboursée",
    refusee: "Refusée",
  };
  return labels[statut] ?? statut;
}
