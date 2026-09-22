import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { marquerNotificationsLues } from "@/lib/lot2";
import { unreadCount } from "@/lib/shell";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const unread = await unreadCount(session);
  const items = await prisma.notification.findMany({
    where: { idUtilisateur: session.id },
    include: { demande: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Centre"
          title="Notifications"
          text={unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}.` : "Tout est à jour."}
          action={
            <form action={marquerNotificationsLues}>
              <button className="icon-btn" aria-label="Tout marquer comme lu" title="Tout marquer comme lu">
                <CheckCheck size={18} />
              </button>
            </form>
          }
        />
        {items.length === 0 ? (
          <EmptyHint
            icon={<Bell size={26} strokeWidth={1.5} />}
            title="Aucune notification"
            text="Les messages de l’équipe apparaîtront ici."
          />
        ) : (
          <ul className="stagger mt-8 space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <article className="notice card" data-new={String(n.statut === "non_lue")}>
                  <p className="kicker">
                    {n.createdAt.toLocaleString("fr-FR")}
                    {n.statut === "non_lue" ? " · Nouveau" : ""}
                  </p>
                  <p className="mt-2 text-[18px] font-semibold tracking-tight">{n.titre}</p>
                  <p className="mt-1 text-sm muted">{n.corps}</p>
                  {n.demande ? (
                    <Link
                      href={
                        session.typeCompte === "collaborateur"
                          ? `/bureau/demandes/${n.demande.id}`
                          : session.typeCompte === "partenaire"
                            ? `/partenaire/demandes/${n.demande.id}`
                            : `/demandes/${n.demande.id}`
                      }
                      className="mt-3 inline-flex items-center gap-1 text-sm link-blue"
                    >
                      {n.demande.reference}
                      <ChevronRight size={14} />
                    </Link>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
