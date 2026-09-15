import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint, StatTile } from "@/components/Surface";
import { TerminerTache } from "@/components/Lot2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { libellePriorite } from "@/lib/labels";

export default async function TachesPage() {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");

  const taches = await prisma.tacheInterne.findMany({
    where: { statut: { not: "termine" } },
    include: { demande: true },
    orderBy: [{ priorite: "desc" }, { createdAt: "asc" }],
  });

  const urgentes = taches.filter((t) => t.priorite === "urgent").length;
  const unread = await unreadCount(session);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <PageIntro
          kicker="Exploitation"
          title="Tâches"
          text="Ce qui doit être traité maintenant, classé par priorité."
        />
        <section className="stagger mt-10 grid gap-3 sm:grid-cols-2">
          <StatTile label="Ouvertes" value={String(taches.length)} hint="Hors tâches terminées" />
          <StatTile label="Urgentes" value={String(urgentes)} hint="À prendre en premier" />
        </section>
        {taches.length === 0 ? (
          <EmptyHint title="File vide" text="Aucune tâche ouverte." />
        ) : (
          <ul className="stagger mt-8 space-y-3">
            {taches.map((t) => (
              <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="kicker">{libellePriorite(t.priorite)}</p>
                  <p className="mt-1 text-[18px] font-semibold tracking-tight">{t.action}</p>
                  <Link href={`/bureau/demandes/${t.demande.id}`} className="text-sm link-blue">
                    {t.demande.reference}
                  </Link>
                </div>
                <TerminerTache tacheId={t.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
