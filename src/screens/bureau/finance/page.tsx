import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { PanelTitle, StatTile } from "@/components/Surface";
import { RapprocherForm, TraiterRemboursement } from "@/components/Lot3";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { euros, libelleFonds, libelleRemboursement } from "@/lib/finance";

export default async function BureauFinancePage() {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");
  const unread = await unreadCount(session);

  const virements = await prisma.operationFinanciere.findMany({
    where: { type: "virement", statut: "en_attente" },
    include: { espace: { include: { demande: { include: { utilisateur: { include: { profil: true } } } } } } },
    orderBy: { createdAt: "desc" },
  });

  const remboursements = await prisma.demandeRemboursement.findMany({
    where: { statut: { notIn: ["remboursee", "refusee"] } },
    include: { demande: { include: { utilisateur: { include: { profil: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const espaces = await prisma.espaceFinancier.findMany({
    include: { demande: { include: { offre: { include: { service: true, pays: true } } } } },
    orderBy: { demande: { dateDerniereActivite: "desc" } },
    take: 20,
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Back-office"
          title="Finance"
          text="Rapprochements, remboursements et suivi des fonds dossier par dossier."
        />

        <section className="stagger mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile label="Virements" value={String(virements.length)} hint="À rapprocher" />
          <StatTile label="Remboursements" value={String(remboursements.length)} hint="Ouverts" />
          <StatTile label="Espaces" value={String(espaces.length)} hint="Derniers dossiers" />
        </section>

        <section className="card mt-6 p-4 sm:p-5">
          <PanelTitle>Virements à rapprocher</PanelTitle>
          {virements.length === 0 ? (
            <p className="muted mt-4 text-sm">Aucun virement en attente.</p>
          ) : (
            <ul className="pay-lines">
              {virements.map((op) => (
                <li key={op.id}>
                  <span>
                    <Link href={`/bureau/demandes/${op.espace.demande.id}`} className="link-blue">
                      {op.espace.demande.reference}
                    </Link>
                    <span className="muted">
                      {" "}
                      · {op.reference} · {euros(op.montant)}
                    </span>
                  </span>
                  <RapprocherForm operationId={op.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card mt-4 p-4 sm:p-5">
          <PanelTitle>Remboursements</PanelTitle>
          {remboursements.length === 0 ? (
            <p className="muted mt-4 text-sm">Aucune demande ouverte.</p>
          ) : (
            <ul className="pay-lines">
              {remboursements.map((r) => (
                <li key={r.id}>
                  <span>
                    <Link href={`/bureau/demandes/${r.idDemande}`} className="link-blue">
                      {r.demande.reference}
                    </Link>
                    <span className="muted">
                      {" "}
                      · {libelleRemboursement(r.statut)}
                    </span>
                  </span>
                  <TraiterRemboursement remboursementId={r.id} statut={r.statut} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card mt-4 p-4 sm:p-5">
          <PanelTitle>
            <Wallet size={18} />
            Dossiers
          </PanelTitle>
          <ul className="pay-lines">
            {espaces.map((e) => (
              <li key={e.idDemande}>
                <Link href={`/bureau/demandes/${e.idDemande}`} className="link-blue">
                  {e.demande.reference} · {e.demande.offre.service.libelle}
                </Link>
                <span className="muted">
                  {libelleFonds(e.statutFonds)} · {euros(e.montantRecu)} / {euros(e.montantAttendu)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
