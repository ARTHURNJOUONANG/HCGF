export const ESPACES = [
  {
    id: "candidat",
    label: "Candidat",
    texte: "Dossiers, pièces et paiements",
    typeCompte: "candidat",
    role: "",
  },
  {
    id: "conseiller",
    label: "Conseiller",
    texte: "File, contrôles et back-office",
    typeCompte: "collaborateur",
    role: "conseiller",
  },
  {
    id: "signataire",
    label: "Signataire",
    texte: "Validation à quatre yeux",
    typeCompte: "collaborateur",
    role: "signataire",
  },
  {
    id: "partenaire",
    label: "Partenaire",
    texte: "Apport de dossiers et commissions",
    typeCompte: "partenaire",
    role: "apporteur",
  },
  {
    id: "delegataire",
    label: "Délégataire",
    texte: "Agir pour un candidat",
    typeCompte: "delegataire",
    role: "delegataire",
  },
] as const;

export type EspaceId = (typeof ESPACES)[number]["id"];

export function espaceParId(id: string | undefined) {
  return ESPACES.find((espace) => espace.id === id) ?? ESPACES[0];
}

export function roleExigeCode(espaceId: string) {
  return espaceId === "conseiller" || espaceId === "signataire";
}

export function rolePublic(espaceId: string) {
  const espace = espaceParId(espaceId);
  return espace.typeCompte !== "collaborateur";
}

export const ESPACES_INSCRIPTION = ESPACES.filter((espace) => espace.typeCompte !== "collaborateur");
