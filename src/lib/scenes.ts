export const SCENES = {
  AVI: { src: "/hcgf/garantie.jpg", alt: "Signature d’un contrat de caution" },
  ASSURANCE: { src: "/hcgf/assurance.jpg", alt: "Dossier d’assurance voyage, passeport et valise" },
  HEBERGEMENT: { src: "/hcgf/hebergement.jpg", alt: "Remise des clés d’un logement étudiant" },
  VOL: { src: "/hcgf/vol.jpg", alt: "Billet d’avion devant la piste" },
  PARIS: { src: "/hcgf/tour-eiffel.jpg", alt: "Paris, destination d’études internationales" },
  ETUDE: { src: "/hcgf/etudiant.jpg", alt: "Étudiante préparant son dossier international" },
  DEPOT: { src: "/hcgf/administratif.jpg", alt: "Constitution des pièces d’un dossier" },
  CONTROLE: { src: "/hcgf/financier.jpg", alt: "Contrôle des justificatifs financiers" },
  PAIEMENT: { src: "/hcgf/paiement.jpg", alt: "Règlement sécurisé d’un dossier" },
} as const;

export type SceneCode = keyof typeof SCENES;

export function sceneService(code?: string) {
  if (code && code in SCENES) return SCENES[code as SceneCode];
  return SCENES.ETUDE;
}
