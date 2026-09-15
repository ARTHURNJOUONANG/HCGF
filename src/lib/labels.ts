export const STATUTS_DOC: Record<string, string> = {
  recu: "Reçu",
  conforme: "Conforme",
  a_verifier: "À vérifier",
  a_remplacer: "À remplacer",
  signe: "Signé",
};

export function libelleStatutDoc(statut: string) {
  return STATUTS_DOC[statut] ?? statut;
}

export const STATUTS_FONDS: Record<string, string> = {
  en_attente: "En attente des fonds",
  partiel: "Paiement partiel",
  fonds_recus: "Fonds reçus",
  rembourse: "Remboursé",
};

export function libelleFonds(statut: string) {
  return STATUTS_FONDS[statut] ?? statut;
}

export function libelleStatutDelegation(statut: string) {
  const labels: Record<string, string> = {
    active: "Active",
    revoquee: "Révoquée",
    expiree: "Expirée",
  };
  return labels[statut] ?? statut;
}

export function libelleStatutComptePartenaire(statut: string) {
  const labels: Record<string, string> = {
    actif: "Actif",
    inactif: "Inactif",
    suspendu: "Suspendu",
  };
  return labels[statut] ?? statut;
}

export function libellePriorite(valeur: string) {
  const labels: Record<string, string> = {
    normal: "Standard",
    prioritaire: "Prioritaire",
    urgent: "Urgent",
  };
  return labels[valeur] ?? valeur;
}

export function libelleRelance(statut: string) {
  const labels: Record<string, string> = {
    envoyee: "Envoyée",
    due: "Due",
    ignoree: "Ignorée",
    echec: "Échec d’envoi",
    planifiee: "Planifiée",
  };
  return labels[statut] ?? statut;
}

export function libelleEcheance(type: string) {
  const labels: Record<string, string> = {
    reponse_dossier: "Réponse dossier",
    paiement: "Paiement",
    document: "Document",
    hold: "Hold",
    sla: "SLA",
  };
  return labels[type] ?? type;
}

export function libelleSav(statut: string) {
  const labels: Record<string, string> = {
    ouverte: "Ouverte",
    en_cours: "En cours",
    attente_candidat: "Attente candidat",
    resolue: "Résolue",
    fermee: "Fermée",
  };
  return labels[statut] ?? statut;
}

export function libelleCategorieSav(categorie: string) {
  const labels: Record<string, string> = {
    document: "Document",
    paiement: "Paiement",
    AVI: "AVI",
    hebergement: "Hébergement",
    assurance: "Assurance",
    vol: "Vol",
    technique: "Technique",
    autre: "Autre",
  };
  return labels[categorie] ?? categorie;
}
