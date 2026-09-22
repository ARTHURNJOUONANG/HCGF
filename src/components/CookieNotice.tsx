"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CLE = "avi_cookies_info";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLE) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Information cookies"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--line)] bg-[var(--paper)]/95 px-4 py-4 shadow-[0_-8px_32px_rgba(6,32,63,0.12)] backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Cookie de session <strong className="text-[var(--ink)]">avi_session</strong> uniquement
          (authentification, httpOnly). Pas de tracking publicitaire.{" "}
          <Link href="/cgv" className="link-blue">
            Politique de confidentialité
          </Link>
        </p>
        <button
          type="button"
          className="btn btn-primary shrink-0 self-end sm:self-auto"
          onClick={() => {
            try {
              localStorage.setItem(CLE, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          J’ai compris
        </button>
      </div>
    </div>
  );
}
