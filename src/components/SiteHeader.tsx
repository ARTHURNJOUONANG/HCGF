"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark } from "./Surface";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Services" },
  { href: "/#avi", label: "Souscription AVI" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ current = "/" }: { current?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className={`vitrine-header${open ? " is-open" : ""}`}>
      <div className="vitrine-shell vitrine-header-row">
        <Link href="/" aria-label="Accueil HCGF" className="brand-link" onClick={() => setOpen(false)}>
          <Mark light />
        </Link>
        <button
          type="button"
          className="vitrine-burger"
          aria-label={open ? "Fermer le menu" : "Menu"}
          aria-expanded={open}
          aria-controls="vitrine-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="vitrine-menu" className="vitrine-menu">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={current === item.href ? "is-on" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/connexion" onClick={() => setOpen(false)}>
            Connexion
          </Link>
          <Link href="/inscription" className="vitrine-cta" onClick={() => setOpen(false)}>
            Ouvrir un espace
          </Link>
        </nav>
      </div>
    </header>
  );
}
