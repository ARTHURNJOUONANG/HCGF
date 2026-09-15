import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { getSession } from "@/lib/auth";
import { unreadCount } from "@/lib/shell";

const STATUTS = [
  ["DRAFT", "Brouillon", "Le dossier a été ouvert. Le candidat n’a pas encore tout complété."],
  ["IN_PROGRESS", "En cours", "L’équipe traite le dossier."],
  ["VALID", "Validé", "Attestation signée. La commission passe à « acquise »."],
  ["CLOSED", "Clôturé", "Le dossier est terminé."],
  ["CANCELLED", "Annulé", "Dossier annulé ou abandonné. Pas de commission à payer."],
] as const;

export default async function PartenaireStatutsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "partenaire") redirect("/tableau-de-bord");
  const unread = await unreadCount(session);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell max-w-3xl py-10 sm:py-14">
        <PageIntro
          kicker="Transparence"
          title="Statuts visibles"
          text="Un partenaire ne voit pas les statuts internes. Seulement ces cinq états."
        />
        <ul className="stagger mt-10 space-y-3">
          {STATUTS.map(([code, label, texte]) => (
            <li key={code} className="card p-5">
              <p className="kicker">{code}</p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight">{label}</p>
              <p className="muted mt-1 text-sm">{texte}</p>
            </li>
          ))}
        </ul>
        <p className="muted mt-6 text-sm">
          <Link href="/partenaire" className="link-blue">
            Retour aux apports
          </Link>
        </p>
      </main>
    </div>
  );
}
