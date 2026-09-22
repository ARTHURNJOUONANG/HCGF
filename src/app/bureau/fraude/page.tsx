import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint, PanelTitle, StatTile } from "@/components/Surface";
import {
  AnalyserFraudeForm,
  ConfirmerAlerteForm,
  LeverAlerteForm,
} from "@/components/LotFraude";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { libelleNiveauFraude, libelleStatutFraude, libelleTypeFraude } from "@/lib/labels";

export default async function BureauFraudePage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");
  const unread = await unreadCount(session);
  const { filtre = "ouvertes" } = await searchParams;

  const where =
    filtre === "toutes"
      ? {}
      : filtre === "levees"
        ? { statut: "levee" }
        : filtre === "confirmees"
          ? { statut: "confirmee" }
          : { statut: { not: "levee" } };

  const [alertes, renforces, ouvertes, confirmees] = await Promise.all([
    prisma.alerteFraude.findMany({
      where,
      include: {
        demande: {
          include: {
            utilisateur: { include: { profil: true } },
            offre: { include: { service: true, pays: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.demande.findMany({
      where: { controleRenforce: true },
      include: {
        utilisateur: { include: { profil: true } },
        offre: { include: { service: true } },
        alertesFraude: { where: { statut: { not: "levee" } } },
      },
      orderBy: { dateDerniereActivite: "desc" },
      take: 40,
    }),
    prisma.alerteFraude.count({ where: { statut: { not: "levee" } } }),
    prisma.alerteFraude.count({ where: { statut: "confirmee" } }),
  ]);

  const filtres = [
    { id: "ouvertes", label: "Actives" },
    { id: "confirmees", label: "Confirmées" },
    { id: "levees", label: "Levées" },
    { id: "toutes", label: "Toutes" },
  ] as const;

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="LOT 9 · Back-office"
          title="Fraude"
          text="Signaux automatiques (pièce partagée, identité, paiement). Une alerte active le contrôle renforcé sans rejeter le dossier."
        />

        <section className="stagger mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile label="Alertes actives" value={String(ouvertes)} hint="Ouvertes ou confirmées" />
          <StatTile label="Confirmées" value={String(confirmees)} hint="Signal validé" />
          <StatTile label="Contrôle renforcé" value={String(renforces.length)} hint="Signature bloquée" />
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          {filtres.map((f) => (
            <Link
              key={f.id}
              href={f.id === "ouvertes" ? "/bureau/fraude" : `/bureau/fraude?filtre=${f.id}`}
              className={filtre === f.id ? "btn btn-primary" : "btn"}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <section className="card mt-6 p-4 sm:p-5">
          <PanelTitle>File d’alertes</PanelTitle>
          {alertes.length === 0 ? (
            <EmptyHint
              icon={<ShieldAlert size={26} strokeWidth={1.5} />}
              title="Aucune alerte"
              text="Les signaux apparaissent au dépôt de pièce, à la saisie d’identité ou au paiement."
            />
          ) : (
            <ul className="mt-5 space-y-4">
              {alertes.map((alerte) => (
                <li key={alerte.id} className="rounded-xl border border-[var(--line)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="kicker">
                        {libelleTypeFraude(alerte.typeSignal)} · {libelleNiveauFraude(alerte.niveau)} ·{" "}
                        {libelleStatutFraude(alerte.statut)}
                      </p>
                      <Link href={`/bureau/demandes/${alerte.demande.id}`} className="link-blue mt-1 inline-block text-[15px] font-semibold tracking-tight">
                        {alerte.demande.reference}
                      </Link>
                      <p className="muted mt-1 text-sm">
                        {alerte.demande.offre.service.libelle} · {alerte.demande.utilisateur.profil?.prenom}{" "}
                        {alerte.demande.utilisateur.profil?.nom}
                      </p>
                      <p className="mt-2 text-sm">{alerte.detail}</p>
                      <p className="muted mt-2 text-xs">
                        {alerte.createdAt.toLocaleString("fr-FR")}
                      </p>
                    </div>
                    {alerte.statut !== "levee" ? (
                      <div className="flex flex-wrap gap-2">
                        {alerte.statut !== "confirmee" ? (
                          <ConfirmerAlerteForm alerteId={alerte.id} />
                        ) : null}
                        <LeverAlerteForm alerteId={alerte.id} />
                        <AnalyserFraudeForm demandeId={alerte.demande.id} />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card mt-4 p-4 sm:p-5">
          <PanelTitle>Dossiers en contrôle renforcé</PanelTitle>
          <p className="muted mt-1 text-sm">La signature reste bloquée tant qu’une alerte n’est pas levée.</p>
          {renforces.length === 0 ? (
            <p className="muted mt-4 text-sm">Aucun dossier bloqué.</p>
          ) : (
            <ul className="pay-lines mt-4">
              {renforces.map((d) => (
                <li key={d.id}>
                  <span>
                    <Link href={`/bureau/demandes/${d.id}`} className="link-blue">
                      {d.reference}
                    </Link>
                    <span className="muted">
                      {" "}
                      · {d.offre.service.libelle} · {d.alertesFraude.length} alerte
                      {d.alertesFraude.length > 1 ? "s" : ""}
                    </span>
                  </span>
                  <AnalyserFraudeForm demandeId={d.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
