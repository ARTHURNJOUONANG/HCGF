export function statutPartenaire(statutDossier: string) {
  if (statutDossier === "validee") return "VALID";
  if (statutDossier === "en_traitement") return "IN_PROGRESS";
  if (statutDossier === "cloturee") return "CLOSED";
  if (statutDossier === "annulee" || statutDossier === "abandonnee") return "CANCELLED";
  return "DRAFT";
}

export function libelleCommission(statut: string) {
  const labels: Record<string, string> = {
    calculee: "Calculée",
    acquise: "Acquise",
    payee: "Payée",
  };
  return labels[statut] ?? statut;
}
