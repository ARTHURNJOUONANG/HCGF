"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="shell py-16 sm:py-24">
      <section className="page-state card">
        <span className="empty-icon">
          <LifeBuoy size={26} strokeWidth={1.5} />
        </span>
        <p className="kicker mt-6">Incident</p>
        <h1 className="display mt-2">Une étape a échoué</h1>
        <p className="empty-text">Réessayez. Si cela se reproduit, ouvrez le dossier depuis le tableau de bord.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Réessayer
          </button>
          <Link href="/" className="btn btn-ghost">
            Accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
