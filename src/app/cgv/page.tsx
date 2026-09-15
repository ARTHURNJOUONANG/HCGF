import Link from "next/link";
import { PublicHeader } from "@/components/Chrome";
import { documentsActifs } from "@/lib/lot6";

const TITRES: Record<string, string> = {
  cgv: "Conditions générales",
  confidentialite: "Politique de confidentialité",
};

export default async function CgvPage() {
  const docs = await documentsActifs();
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="shell max-w-3xl py-10 sm:py-14">
        <p className="kicker">Documents contractuels</p>
        <h1 className="display mt-2 text-[40px] sm:text-[48px]">Versions en vigueur</h1>
        <p className="page-intro-text">
          L’acceptation enregistre <strong>cette</strong> version. Une nouvelle publication ne réécrit pas les dossiers déjà ouverts.
        </p>
        <div className="mt-10 space-y-8">
          {docs.map((d) => (
            <article key={d.id} className="card p-6 sm:p-8">
              <p className="kicker">
                {TITRES[d.type] ?? d.type} · {d.numeroVersion}
              </p>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-[var(--muted)]">
                {d.contenu}
              </pre>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm">
          <Link href="/inscription" className="link-blue">
            Retour à l’inscription
          </Link>
        </p>
      </main>
    </div>
  );
}
