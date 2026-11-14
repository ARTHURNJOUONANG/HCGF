/** Thèmes visuels proposés à l’utilisateur (choix mémorisé dans un cookie). */
export const THEMES = [
  {
    id: "tricolore",
    label: "Tricolore",
    description: "Bleu, blanc, rouge",
    nuancier: ["#0055a4", "#ffffff", "#e30613"],
    couleurNavigateur: "#0055a4",
  },
  {
    id: "horizon",
    label: "Horizon",
    description: "Bleu nuit & orange",
    nuancier: ["#0a1c38", "#17406f", "#f47b20"],
    couleurNavigateur: "#0a1c38",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const COOKIE_THEME = "hcgf_theme";
export const THEME_DEFAUT: ThemeId = "tricolore";
/** Événement émis côté client quand l’utilisateur change de thème. */
export const EVENEMENT_THEME = "hcgf:theme";

export function themeValide(valeur: string | undefined | null): ThemeId {
  return THEMES.some((t) => t.id === valeur) ? (valeur as ThemeId) : THEME_DEFAUT;
}

export function themeParId(id: ThemeId) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
