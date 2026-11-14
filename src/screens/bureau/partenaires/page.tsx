import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint, StatTile } from "@/components/Surface";
import { PayerCommissionForm } from "@/components/Lot5";
import { CreerPartenaireForm } from "@/components/LotEquipe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { euros } from "@/lib/finance";
import { libelleCommission } from "@/lib/partenaire";
import { libelleStatutComptePartenaire } from "@/lib/labels";

const TYPES: Record<string, string> = {
  agence: "Agence",
  ecole: "École",
  apporteur: "Apporteur",
};

export default async function BureauPartenairesPage() {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");
  const unread = await unreadCount(session);

  const partenaires = await prisma.partenaire.findMany({
    include: {
      agents: { include: { profil: true } },
      regles: { where: { actif: true } },
      demandes: true,
    },
    orderBy: { nom: "asc" },
  });

  const commissions = await prisma.commission.findMany({
    include: {
      demande: { include: { offre: { include: { service: true } }, utilisateur: { include: { profil: true } } } },
      regle: { include: { partenaire: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Back-office"
          title="Partenaires"
          text="Réseau, règles de commission et paiements. Après chaque nouveau compte partenaire, le code PD change."
        />

        <section className="stagger mt-6 grid gap-3 sm:grid-cols-2">
          <StatTile label="Partenaires" value={String(partenaires.length)} hint="Actifs au catalogue" />
          <StatTile label="Commissions" value={String(commissions.length)} hint="Toutes étapes" />
        </section>

        <section className="card mt-6 p-4 sm:p-5">
          <p className="kicker">Nouveau compte</p>
          <h2 className="form-desk-title">Créer un partenaire</h2>
          <div className="mt-6">
            <CreerPartenaireForm />
          </div>
        </section>

        <section className="stagger mt-8 space-y-3">
          {partenaires.map((p) => (
            <article key={p.id} className="card p-4">
              <p className="kicker">
                {TYPES[p.type] ?? p.type} · {libelleStatutComptePartenaire(p.statut)}
              </p>
              <h2 className="mt-1 text-[16px] font-semibold tracking-tight">{p.nom}</h2>
              <p className="muted mt-1 text-sm">
                {p.demandes.length} dossier{p.demandes.length > 1 ? "s" : ""}
                {p.regles[0]
                  ? p.regles[0].montantFixe > 0
                    ? ` · fixe ${euros(p.regles[0].montantFixe)}`
                    : ` · ${p.regles[0].taux} %`
                  : ""}
              </p>
              <p className="muted mt-1 text-sm">
                {p.agents.map((a) => `${a.profil?.prenom ?? ""} ${a.profil?.nom ?? ""}`.trim() || a.email).join(" · ")}
              </p>
            </article>
          ))}
        </section>

        <h2 className="panel-title mt-12">Commissions</h2>
        {commissions.length === 0 ? (
          <EmptyHint title="Aucune commission" text="Elle apparaît à l’ouverture d’un dossier partenaire." />
        ) : (
        <ul className="stagger mt-4 space-y-3">
          {commissions.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <Link href={`/bureau/demandes/${c.demande.id}`} className="kicker link-blue">
                  {c.demande.reference}
                </Link>
                <p className="mt-1 text-[16px] font-semibold tracking-tight">
                  {c.regle.partenaire.nom} · {euros(c.montantCalcule)}
                </p>
                <p className="muted text-sm">
                  {c.demande.utilisateur.profil?.prenom} {c.demande.utilisateur.profil?.nom} ·{" "}
                  {c.demande.offre.service.libelle}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="pill">{libelleCommission(c.statut)}</span>
                {c.statut === "acquise" ? <PayerCommissionForm commissionId={c.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
        )}
      </main>
    </div>
  );
}
