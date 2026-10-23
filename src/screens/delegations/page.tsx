import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { EmptyHint } from "@/components/Surface";
import { DelegationForm, RevoquerForm } from "@/components/Lot68";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
import { DROITS_DELEGABLES } from "@/lib/droits";
import { libelleStatutDelegation } from "@/lib/labels";

const LIBELLE_DROIT = Object.fromEntries(DROITS_DELEGABLES);

export default async function DelegationsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "candidat") redirect("/tableau-de-bord");
  const unread = await unreadCount(session);

  const [demandes, delegations] = await Promise.all([
    prisma.demande.findMany({
      where: { idUtilisateur: session.id },
      select: { id: true, reference: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.delegation.findMany({
      where: { idMandant: session.id },
      include: { mandataire: { include: { profil: true } }, droits: true, demande: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Compte"
          title="Délégations"
          text="Un parent ou un garant agit avec son propre accès. Signature, identité et suppression restent à vous."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="card p-4 sm:p-5">
            <p className="kicker">Nouveau mandat</p>
            <h2 className="form-desk-title">Autoriser un tiers</h2>
            <div className="mt-6">
              <DelegationForm demandes={demandes} />
            </div>
          </section>
          <section className="space-y-3">
            {delegations.length === 0 ? (
              <EmptyHint
                icon={<Users size={26} strokeWidth={1.5} />}
                title="Aucune délégation"
                text="Autorisez un parent ou un garant depuis le formulaire."
              />
            ) : (
              delegations.map((d) => (
                <article key={d.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="kicker">
                        {libelleStatutDelegation(d.statut)} · {d.demande?.reference ?? "Compte entier"}
                      </p>
                      <h3 className="piece-name mt-1">
                        {d.mandataire.profil?.prenom} {d.mandataire.profil?.nom}
                      </h3>
                      <p className="muted text-sm">{d.mandataire.email}</p>
                    </div>
                    <span className={`pill ${d.statut === "active" ? "pill-ok" : ""}`}>
                      {libelleStatutDelegation(d.statut)}
                    </span>
                  </div>
                  <div className="right-chips">
                    {d.droits.map((r) => (
                      <span key={r.id} className="right-chip" style={{ cursor: "default" }}>
                        {LIBELLE_DROIT[r.codeDroit] ?? r.codeDroit}
                      </span>
                    ))}
                  </div>
                  {d.statut === "active" ? (
                    <div className="mt-4">
                      <RevoquerForm delegationId={d.id} />
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
