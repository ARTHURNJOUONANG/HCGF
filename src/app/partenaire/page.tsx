import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { DossierTile, EmptyHint, StatTile } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { PaysNom } from "@/components/Pays";
import { SERVICES } from "@/lib/metier";
import { statutPartenaire } from "@/lib/partenaire";
import { euros } from "@/lib/finance";

export default async function PartenaireHomePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "partenaire") redirect("/tableau-de-bord");

  const unread = await unreadCount(session);
  const user = await prisma.utilisateur.findUnique({
    where: { id: session.id },
    include: { partenaire: true },
  });
  if (!user?.idPartenaire) redirect("/connexion");

  const dossiers = await prisma.demande.findMany({
    where: { idPartenaire: user.idPartenaire },
    include: {
      offre: { include: { pays: true, service: true } },
      utilisateur: { include: { profil: true } },
      commission: true,
    },
    orderBy: { dateDerniereActivite: "desc" },
  });

  const ouverts = dossiers.filter((d) => ["brouillon", "en_traitement"].includes(d.statut)).length;
  const valides = dossiers.filter((d) => d.statut === "validee").length;
  const aRecevoir = dossiers
    .filter((d) => d.commission && d.commission.statut !== "payee")
    .reduce((s, d) => s + (d.commission?.montantCalcule ?? 0), 0);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <PageIntro
          kicker={user.partenaire?.nom ?? "Partenaire"}
          title="Mes apports"
          text="Vous voyez uniquement les dossiers que vous avez ouverts, avec un statut limité."
          action={
            <Link href="/partenaire/nouvelle" className="btn btn-primary">
              <Plus size={16} />
              Initier
            </Link>
          }
        />

        <section className="stagger mt-10 grid gap-3 sm:grid-cols-3">
          <StatTile label="Dossiers" value={String(dossiers.length)} hint="Vos apports" />
          <StatTile label="Ouverts" value={String(ouverts)} hint={`${valides} validés`} />
          <StatTile label="À recevoir" value={euros(aRecevoir)} hint="Commissions" />
        </section>
        <p className="mt-4 text-sm text-[var(--muted)]">
          <Link href="/partenaire/commissions" className="font-medium text-[var(--blue)]">
            Voir le détail des commissions
          </Link>
        </p>

        {dossiers.length === 0 ? (
          <EmptyHint
            title="Aucun apport"
            text="Ouvrez un dossier pour un candidat. Il sera notifié pour le compléter."
            action={
              <Link href="/partenaire/nouvelle" className="btn btn-primary mt-6">
                <Plus size={16} />
                Initier
              </Link>
            }
          />
        ) : (
          <ul className="stagger mt-8 space-y-3">
            {dossiers.map((d) => (
              <li key={d.id}>
                <DossierTile
                  href={`/partenaire/demandes/${d.id}`}
                  reference={d.reference}
                  title={SERVICES[d.offre.codeService] ?? d.offre.service.libelle}
                  service={d.offre.codeService}
                  country={<PaysNom code={d.offre.codePays} libelle={d.offre.pays.libelle} />}
                  meta={
                    <>
                      {d.utilisateur.profil?.prenom} {d.utilisateur.profil?.nom}
                      {d.commission ? ` · ${euros(d.commission.montantCalcule)}` : ""}
                    </>
                  }
                  pill={<span className="pill">{statutPartenaire(d.statut)}</span>}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
