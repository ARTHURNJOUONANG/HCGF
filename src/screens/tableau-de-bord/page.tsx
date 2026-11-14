import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { DossierTile, StatTile } from "@/components/Surface";
import { BienvenueCandidat, prochaineAction } from "@/components/EspaceCandidat";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SERVICES } from "@/lib/metier";
import { unreadCount } from "@/lib/shell";
import { PaysNom } from "@/components/Pays";
import { euros, jour, libelleFonds } from "@/lib/finance";

export default async function TableauDeBordPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte === "collaborateur") redirect("/bureau");
  if (session.typeCompte === "partenaire") redirect("/partenaire");
  if (session.typeCompte === "delegataire") redirect("/delegue");
  const unread = await unreadCount(session);

  const demandes = await prisma.demande.findMany({
    where: { idUtilisateur: session.id },
    include: { offre: { include: { pays: true, service: true } }, espaceFinancier: true, partenaire: true },
    orderBy: { createdAt: "desc" },
  });

  const brouillons = demandes.filter((d) => d.statut === "brouillon").length;
  const enCours = demandes.filter((d) => d.statut === "en_traitement").length;

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker={`Bonjour ${session.prenom || ""}`.trim()}
          title={demandes.length === 0 ? "Bienvenue dans votre espace" : "Mes demandes"}
          text={
            demandes.length === 0
              ? "Préparez votre départ étape par étape. Chaque démarche a son propre dossier, sécurisé et suivi par notre équipe."
              : "Chaque dossier reste isolé. Documents et historique ne se mélangent jamais."
          }
          action={
            demandes.length === 0 ? undefined : (
              <Link href="/demandes/nouvelle" className="btn btn-primary">
                <Plus size={16} />
                Nouvelle demande
              </Link>
            )
          }
        />

        {demandes.length === 0 ? (
          <BienvenueCandidat />
        ) : (
          <>
        <section className="stagger stat-row mt-6">
          <StatTile label="Dossiers" value={String(demandes.length)} hint="Tous services" />
          <StatTile label="À compléter" value={String(brouillons)} hint="Brouillons" />
          <StatTile label="En cours" value={String(enCours)} hint="Chez l’équipe" />
        </section>

          <ul className="stagger mt-8 space-y-3">
            {demandes.map((d) => (
              <li key={d.id}>
                <DossierTile
                  href={`/demandes/${d.id}`}
                  reference={d.reference}
                  title={SERVICES[d.offre.codeService] ?? d.offre.service.libelle}
                  service={d.offre.codeService}
                  country={<PaysNom code={d.offre.codePays} libelle={d.offre.pays.libelle} />}
                  meta={
                    <>
                      {jour(d.createdAt)}
                      {d.partenaire ? ` · Apporté par ${d.partenaire.nom}` : ""}
                      {d.espaceFinancier
                        ? ` · ${libelleFonds(d.espaceFinancier.statutFonds)} · ${euros(d.espaceFinancier.montantAttendu)}`
                        : ""}
                    </>
                  }
                  statut={d.statut}
                  progress={d.pourcentageAvancement}
                  nextStep={prochaineAction(d.etapeCourante)}
                />
              </li>
            ))}
          </ul>
          </>
        )}
      </main>
    </div>
  );
}
