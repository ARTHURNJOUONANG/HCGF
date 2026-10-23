import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint, StatTile } from "@/components/Surface";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { euros } from "@/lib/finance";
import { libelleCommission } from "@/lib/partenaire";

export default async function PartenaireCommissionsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "partenaire") redirect("/tableau-de-bord");
  const unread = await unreadCount(session);

  const user = await prisma.utilisateur.findUnique({ where: { id: session.id } });
  if (!user?.idPartenaire) redirect("/connexion");

  const commissions = await prisma.commission.findMany({
    where: { regle: { idPartenaire: user.idPartenaire } },
    include: { demande: { include: { offre: { include: { service: true } }, utilisateur: { include: { profil: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const total = commissions.reduce((s, c) => s + c.montantCalcule, 0);
  const acquises = commissions.filter((c) => c.statut === "acquise").reduce((s, c) => s + c.montantCalcule, 0);
  const payees = commissions.filter((c) => c.statut === "payee").reduce((s, c) => s + c.montantCalcule, 0);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Rémunération"
          title="Commissions"
          text="Calculée à l’ouverture, acquise à la signature, payée par l’équipe."
        />
        <section className="stagger mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile label="Total" value={euros(total)} hint="Toutes étapes" />
          <StatTile label="Acquises" value={euros(acquises)} hint="À encaisser" />
          <StatTile label="Payées" value={euros(payees)} hint="Déjà versées" />
        </section>
        {commissions.length === 0 ? (
          <EmptyHint title="Aucune commission" text="Elle apparaît à l’ouverture d’un dossier." />
        ) : (
        <ul className="stagger mt-8 space-y-3">
          {commissions.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/partenaire/demandes/${c.demande.id}`} className="kicker link-blue">
                    {c.demande.reference}
                  </Link>
                  <p className="mt-1 text-[15px] font-semibold tracking-tight">
                    {c.demande.offre.service.libelle} · {euros(c.montantCalcule)}
                  </p>
                  <p className="muted mt-1 text-sm">
                    {c.demande.utilisateur.profil?.prenom} {c.demande.utilisateur.profil?.nom}
                  </p>
                </div>
                <span className="pill">{libelleCommission(c.statut)}</span>
              </div>
            </li>
          ))}
        </ul>
        )}
      </main>
    </div>
  );
}
