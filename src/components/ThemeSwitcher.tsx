"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Palette } from "lucide-react";
import { COOKIE_THEME, EVENEMENT_THEME, THEMES, themeParId, themeValide, type ThemeId } from "@/lib/theme";

function lireTheme(): ThemeId {
  return themeValide(document.documentElement.dataset.theme);
}

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT_THEME, rappel);
  return () => window.removeEventListener(EVENEMENT_THEME, rappel);
}

export function appliquerTheme(id: ThemeId) {
  const racine = document.documentElement;
  const changer = () => {
    racine.dataset.theme = id;
    document.cookie = `${COOKIE_THEME}=${id}; path=/; max-age=31536000; samesite=lax`;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeParId(id).couleurNavigateur);
    window.dispatchEvent(new CustomEvent(EVENEMENT_THEME, { detail: id }));
  };
  // Fondu doux entre les deux palettes quand le navigateur le permet.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reduit) {
    racine.classList.add("theme-switching");
    const transition = doc.startViewTransition(changer) as { finished?: Promise<unknown> };
    transition.finished?.finally(() => racine.classList.remove("theme-switching"));
  } else {
    changer();
  }
}

function Nuancier({ couleurs }: { couleurs: readonly string[] }) {
  return (
    <span className="theme-swatch" aria-hidden="true">
      {couleurs.map((c) => (
        <span key={c} style={{ background: c }} />
      ))}
    </span>
  );
}

/** Choix complet (page Compte) : deux cartes avec aperçu. */
export function ThemeChoix() {
  const actuel = useSyncExternalStore(abonner, lireTheme, () => "tricolore" as ThemeId);
  return (
    <div className="theme-grid" role="radiogroup" aria-label="Thème de l’interface">
      {THEMES.map((theme) => {
        const actif = actuel === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={actif}
            className={`theme-card${actif ? " is-on" : ""}`}
            onClick={() => appliquerTheme(theme.id)}
          >
            <span className={`theme-preview theme-preview-${theme.id}`} aria-hidden="true">
              <span className="tp-bar" />
              <span className="tp-title" />
              <span className="tp-line" />
              <span className="tp-btn" />
            </span>
            <span className="theme-card-text">
              <strong>{theme.label}</strong>
              <small>{theme.description}</small>
            </span>
            {actif ? <Check className="theme-card-check" size={16} strokeWidth={2.5} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Bouton compact (en-têtes) : ouvre un petit menu des thèmes. */
export function ThemeSwitcher({ surFondSombre = false }: { surFondSombre?: boolean }) {
  const actuel = useSyncExternalStore(abonner, lireTheme, () => "tricolore" as ThemeId);
  const [ouvert, setOuvert] = useState(false);
  return (
    <div
      className={`theme-switch${surFondSombre ? " is-dark" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOuvert(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOuvert(false);
      }}
    >
      <button
        type="button"
        className="icon-btn theme-switch-btn"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Changer le thème"
        title="Thème"
        onClick={() => setOuvert((v) => !v)}
      >
        <Palette size={17} strokeWidth={1.75} />
      </button>
      {ouvert ? (
        <div className="theme-menu" role="menu">
          <p className="theme-menu-title">Thème</p>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="menuitemradio"
              aria-checked={actuel === theme.id}
              className={`theme-menu-item${actuel === theme.id ? " is-on" : ""}`}
              onClick={() => {
                appliquerTheme(theme.id);
                setOuvert(false);
              }}
            >
              <Nuancier couleurs={theme.nuancier} />
              <span>
                <strong>{theme.label}</strong>
                <small>{theme.description}</small>
              </span>
              {actuel === theme.id ? <Check size={15} strokeWidth={2.5} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
