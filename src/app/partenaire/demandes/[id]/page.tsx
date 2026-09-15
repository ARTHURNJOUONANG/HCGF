import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/Chrome";
import { DossierHero, SoftMetric } from "@/components/Surface";
import { ChecklistRail } from "@/components/DossierDesk";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { PaysNom } from "@/components/Pays";
import { euros } from "@/lib/finance";
import { libelleCommission, statutPartenaire } from "@/lib/partenaire";

export default async function PartenaireDemandePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "partenaire") redirect("/tableau-de-bord");
  const unread = await unreadCount(session);
  const { id } = await params;

  const user = await prisma.utilisateur.findUnique({ where: { id: session.id } });
  if (!user?.idPartenaire) redirect("/connexion");

  const demande = await prisma.demande.findFirst({
    where: { id, idPartenaire: user.idPartenaire },
    include: {
      offre: { include: { pays: true, service: true } },
      utilisateur: { include: { profil: true } },
      commission: { include: { regle: true } },
      checklist: { orderBy: { ordre: "asc" } },
    },
  });
  if (!demande) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <DossierHero
          backHref="/partenaire"
          backLabel="Apports"
          reference={demande.reference}
          title={demande.offre.service.libelle}
          country={<PaysNom code={demande.offre.codePays} libelle={demande.offre.pays.libelle} size="lg" />}
          meta={
            <>
              {demande.utilisateur.profil?.prenom} {demande.utilisateur.profil?.nom} · {demande.utilisateur.email}
            </>
          }
          aside={<span className="pill">{statutPartenaire(demande.statut)}</span>}
        />

        <div className="workspace">
          <section className="card p-6 sm:p-8">
            <p className="kicker">Apport</p>
            <h2 className="form-desk-title">Suivi limité</h2>
            <p className="muted mt-2 text-sm">
              Les pièces, messages et paiements restent dans l’espace candidat.
            </p>
            {demande.commission ? (
              <div className="mt-6">
                <SoftMetric label="Commission" value={euros(demande.commission.montantCalcule)} />
                <p className="muted mt-3 text-sm">
                  {libelleCommission(demande.commission.statut)}
                  {demande.commission.regle.taux > 0 ? ` · ${demande.commission.regle.taux} %` : ""}
                  {demande.commission.regle.montantFixe > 0
                    ? ` · fixe ${euros(demande.commission.regle.montantFixe)}`
                    : ""}
                </p>
              </div>
            ) : null}
            <p className="mt-6 text-sm">
              <Link href="/partenaire/statuts" className="link-blue">
                Statuts partenaires
              </Link>
            </p>
          </section>
          <aside className="workspace-rail">
            <ChecklistRail items={demande.checklist} />
          </aside>
        </div>
      </main>
    </div>
  );
}
