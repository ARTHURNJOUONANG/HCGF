import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { DossierTile, EmptyHint } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { demandesDeleguees } from "@/lib/delegation";
import { PaysNom } from "@/components/Pays";
import { SERVICES } from "@/lib/metier";
import { DROITS_DELEGABLES } from "@/lib/droits";

const LIBELLE_DROIT = Object.fromEntries(DROITS_DELEGABLES);

export default async function DelegueHomePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "delegataire") redirect("/tableau-de-bord");
  const unread = await unreadCount(session);
  const { ids, delegations } = await demandesDeleguees(session.id);

  const dossiers = ids.length
    ? await prisma.demande.findMany({
        where: { id: { in: ids } },
        include: { offre: { include: { pays: true, service: true } }, utilisateur: { include: { profil: true } } },
        orderBy: { dateDerniereActivite: "desc" },
      })
    : [];

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <PageIntro
          kicker="Espace délégué"
          title="Dossiers autorisés"
          text="Vous agissez avec vos identifiants. Les droits sont limités par le titulaire."
        />
        {delegations[0] ? (
          <p className="muted mt-4 text-sm">
            Mandat de {delegations[0].mandant.profil?.prenom} {delegations[0].mandant.profil?.nom} ·{" "}
            {delegations[0].droits.map((d) => LIBELLE_DROIT[d.codeDroit] ?? d.codeDroit).join(" · ")}
          </p>
        ) : null}
        {dossiers.length === 0 ? (
          <EmptyHint title="Aucun dossier" text="Aucun mandat actif pour le moment." />
        ) : (
          <ul className="stagger mt-8 space-y-3">
            {dossiers.map((d) => (
              <li key={d.id}>
                <DossierTile
                  href={`/demandes/${d.id}`}
                  reference={d.reference}
                  title={SERVICES[d.offre.codeService] ?? d.offre.service.libelle}
                  service={d.offre.codeService}
                  country={<PaysNom code={d.offre.codePays} libelle={d.offre.pays.libelle} />}
                  meta={
                    <>
                      {d.utilisateur.profil?.prenom} {d.utilisateur.profil?.nom}
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
