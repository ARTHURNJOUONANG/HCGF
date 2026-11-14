import Link from "next/link";
import { Compass } from "lucide-react";
import { PublicHeader } from "@/components/Chrome";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="shell py-16 sm:py-24">
        <section className="page-state card">
          <span className="empty-icon">
            <Compass size={26} strokeWidth={1.5} />
          </span>
          <p className="kicker mt-6">404</p>
          <h1 className="display mt-2">Cette page n’existe pas</h1>
          <p className="empty-text">Le lien est ancien, ou le dossier n’est plus accessible depuis cet espace.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-primary">
              Accueil
            </Link>
            <Link href="/connexion" className="btn btn-ghost">
              Connexion
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
