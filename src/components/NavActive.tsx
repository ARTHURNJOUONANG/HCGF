"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type LienNav = { href: string; label: string; icon: ReactNode; compact?: boolean; badge?: number };

function estActif(pathname: string, href: string) {
  if (href === "/bureau" || href === "/partenaire" || href === "/tableau-de-bord" || href === "/delegue") {
    return pathname === href || (href === "/tableau-de-bord" && pathname.startsWith("/demandes/") && !pathname.endsWith("/nouvelle"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Liens de l’en-tête, avec l’onglet courant mis en évidence. */
export function LiensEntete({ items }: { items: LienNav[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const actif = estActif(pathname, item.href);
        return item.compact ? (
          <Link
            key={item.href}
            href={item.href}
            className={`icon-btn${actif ? " is-on" : ""}`}
            aria-label={item.label}
            aria-current={actif ? "page" : undefined}
            title={item.label}
          >
            {item.icon}
          </Link>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={`icon-nav${actif ? " is-on" : ""}`}
            aria-current={actif ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

/** Barre d’onglets en bas d’écran (mobile), à portée de pouce. */
export function BarreMobile({ items }: { items: LienNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {items.map((item) => {
        const actif = estActif(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`tabbar-item${actif ? " is-on" : ""}`}
            aria-current={actif ? "page" : undefined}
          >
            <span className="tabbar-icon">
              {item.icon}
              {item.badge ? <span className="badge">{item.badge > 9 ? "9+" : item.badge}</span> : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
