"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const CLE = "avi_cookies_info";

function abonnementVide() {
  return () => {};
}

function lireDejaVu() {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

export function CookieNotice() {
  // Lu côté client uniquement : rien au rendu serveur, pas d’écart d’hydratation.
  const dejaVu = useSyncExternalStore(abonnementVide, lireDejaVu, () => true);
  const [ferme, setFerme] = useState(false);

  if (dejaVu || ferme) return null;

  return (
    <div
      role="dialog"
      aria-label="Information cookies"
      className="cookie-notice"
    >
      <p>
        <Cookie size={18} aria-hidden className="cookie-icon" />
        <span>
          Un seul cookie, pour garder votre session ouverte (et votre thème). Aucun suivi publicitaire.{" "}
          <Link href="/cgv" className="link-blue">
            En savoir plus
          </Link>
        </span>
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          try {
            localStorage.setItem(CLE, "1");
          } catch {
            /* ignore */
          }
          setFerme(true);
        }}
      >
        J’ai compris
      </button>
    </div>
  );
}
