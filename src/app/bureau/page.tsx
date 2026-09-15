import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { DossierTile, EmptyHint, StatTile } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { PaysNom } from "@/components/Pays";

export default async function BureauPage() {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");

  const unread = await unreadCount(session);
  const dossiers = await prisma.demande.findMany({
    include: {
      utilisateur: { include: { profil: true } },
      offre: { include: { pays: true, service: true } },
      taches: { where: { statut: "a_faire" } },
      partenaire: true,
    },
    orderBy: { dateDerniereActivite: "desc" },
  });

  const brouillons = dossiers.filter((d) => d.statut === "brouillon").length;
  const enCours = dossiers.filter((d) => d.statut === "en_traitement").length;
  const taches = dossiers.reduce((n, d) => n + d.taches.length, 0);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <PageIntro
          kicker={`Back-office · ${session.role || "collaborateur"}`}
          title="File du jour"
          text="Les dossiers les plus actifs remontent en premier. Ouvrez-en un pour contrôler, relancer ou signer."
        />

        <section className="stagger mt-10 grid gap-3 sm:grid-cols-3">
          <StatTile label="File" value={String(dossiers.length)} hint="Tous les dossiers ouverts" />
          <StatTile label="Brouillons" value={String(brouillons)} hint={`${enCours} en traitement`} />
          <StatTile label="Tâches" value={String(taches)} hint="À traiter maintenant" />
        </section>

        {dossiers.length === 0 ? (
          <EmptyHint title="Aucun dossier" text="La file est vide pour le moment." />
        ) : (
          <ul className="stagger mt-8 space-y-3">
            {dossiers.map((d) => (
              <li key={d.id}>
                <DossierTile
                  href={`/bureau/demandes/${d.id}`}
                  reference={d.reference}
                  title={d.offre.service.libelle}
                  service={d.offre.codeService}
                  country={<PaysNom code={d.offre.codePays} libelle={d.offre.pays.libelle} />}
                  meta={
                    <>
                      {d.utilisateur.profil?.prenom} {d.utilisateur.profil?.nom}
                      {d.partenaire ? ` · ${d.partenaire.nom}` : ""}
                      {d.taches.length > 0 ? ` · ${d.taches.length} tâche${d.taches.length > 1 ? "s" : ""}` : ""}
                    </>
                  }
                  statut={d.statut}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
