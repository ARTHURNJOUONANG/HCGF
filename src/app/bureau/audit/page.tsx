import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";

export default async function AuditPage() {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");

  const lignes = await prisma.journalAudit.findMany({
    include: { acteur: true, demande: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const unread = await unreadCount(session);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <PageIntro
          kicker="Traçabilité"
          title="Audit"
          text="Qui, quoi, quand, quel dossier. Les 80 derniers événements."
        />
        {lignes.length === 0 ? (
          <EmptyHint title="Journal vide" text="Aucune action n’a encore été enregistrée." />
        ) : (
          <div className="card mt-8 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quand</th>
                  <th>Qui</th>
                  <th>Action</th>
                  <th>Dossier</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id}>
                    <td>{l.createdAt.toLocaleString("fr-FR")}</td>
                    <td>{l.acteur?.email ?? "—"}</td>
                    <td>{l.action}</td>
                    <td>{l.demande?.reference ?? "—"}</td>
                    <td className="muted">{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
