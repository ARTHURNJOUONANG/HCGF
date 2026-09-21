export const ESPACES = [
  {
    id: "candidat",
    label: "Candidat",
    texte: "Dossiers, pièces et paiements",
    typeCompte: "candidat",
    role: "",
  },
  {
    id: "controleur",
    label: "Contrôleur",
    texte: "File, contrôles et back-office",
    typeCompte: "collaborateur",
    role: "controleur",
  },
  {
    id: "administrateur",
    label: "Administrateur",
    texte: "Signature et administration de l’équipe",
    typeCompte: "collaborateur",
    role: "administrateur",
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

const ALIAS_ESPACE: Record<string, EspaceId> = {
  conseiller: "controleur",
  signataire: "administrateur",
};

export function espaceParId(id: string | undefined) {
  const cle = id ? ALIAS_ESPACE[id] ?? id : undefined;
  return ESPACES.find((espace) => espace.id === cle) ?? ESPACES[0];
}

export function roleExigeCode(espaceId: string) {
  const id = ALIAS_ESPACE[espaceId] ?? espaceId;
  return id === "controleur" || id === "administrateur";
}

export function rolePublic(espaceId: string) {
  const espace = espaceParId(espaceId);
  return espace.typeCompte !== "collaborateur";
}

/** Anciens libellés encore acceptés en lecture (migration). */
export function normaliserRoleCollaborateur(role: string) {
  if (role === "conseiller") return "controleur";
  if (role === "signataire") return "administrateur";
  return role;
}

export function estAdministrateur(role: string) {
  const r = normaliserRoleCollaborateur(role);
  return r === "administrateur";
}

export function estControleur(role: string) {
  return normaliserRoleCollaborateur(role) === "controleur";
}

export const ESPACES_INSCRIPTION = ESPACES.filter((espace) => espace.typeCompte !== "collaborateur");
