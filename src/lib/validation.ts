export function validerIban(iban: string) {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact)) {
    return "Indiquez un IBAN valide.";
  }
  return null;
}

export function tronquerTexte(valeur: string, max: number) {
  return valeur.trim().slice(0, max);
}

export function validerLongueur(valeur: string, max: number, libelle = "Ce texte") {
  if (valeur.trim().length > max) {
    return `${libelle} est trop long (${max} caractères max).`;
  }
  return null;
}
