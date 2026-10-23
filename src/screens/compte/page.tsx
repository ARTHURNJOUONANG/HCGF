import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { FermerCompteForm, RevoquerSessionsForm } from "@/components/LotCompte";
import { getSession } from "@/lib/auth";
import { listerSessionsActives } from "@/lib/rgpd";
import { unreadCount } from "@/lib/shell";

const LIBELLE_COMPTE: Record<string, string> = {
  candidat: "Candidat",
  collaborateur: "Équipe",
  partenaire: "Partenaire",
  delegataire: "Délégataire",
};

export default async function ComptePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const unread = await unreadCount(session);
  const sessions = await listerSessionsActives();

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <PageIntro
          kicker="Confidentialité"
          title="Mon compte"
          text="Exportez vos données, surveillez les sessions ouvertes et, si besoin, fermez l’espace."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="card p-4 sm:p-5 lg:col-span-2">
            <p className="kicker">RGPD</p>
            <h2 className="form-desk-title">Vos droits</h2>
            <p className="muted mt-3 text-sm leading-relaxed">
              Accès et portabilité (export JSON), rectification via vos formulaires de dossier,
              effacement à la fermeture du compte (pièces, OCR, messages, profil anonymisé).
              Conservation des pièces : 24 mois après clôture, puis purge automatique. Traces de
              connexion : 30 jours.{" "}
              <a href="/cgv" className="link-blue">
                Politique &amp; mentions
              </a>
            </p>
          </section>

          <section className="card p-4 sm:p-5">
            <p className="kicker">Identité</p>
            <h2 className="form-desk-title">
              {session.prenom} {session.nom}
            </h2>
            <p className="muted mt-2 text-sm">{session.email}</p>
            <p className="muted mt-1 text-sm">
              {LIBELLE_COMPTE[session.typeCompte] ?? session.typeCompte}
              {session.role ? ` · ${session.role}` : ""}
            </p>
            <a href="/api/compte/export" className="btn btn-primary mt-6 inline-flex">
              Télécharger mes données
            </a>
          </section>

          <section className="card p-4 sm:p-5">
            <p className="kicker">Sessions</p>
            <h2 className="form-desk-title">Appareils connectés</h2>
            {"error" in sessions ? (
              <p className="muted mt-4 text-sm">{sessions.error}</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {sessions.sessions.map((item) => (
                  <li key={item.id} className="rounded-xl border border-[var(--line)] px-4 py-3">
                    <p className="piece-name">
                      {item.courante ? "Cet appareil" : "Autre session"}
                    </p>
                    <p className="muted text-sm">
                      {item.createdAt.toLocaleString("fr-FR")}
                      {item.ip ? ` · ${item.ip}` : ""}
                    </p>
                    {item.userAgent ? (
                      <p className="muted mt-1 truncate text-xs">{item.userAgent}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <RevoquerSessionsForm />
            </div>
          </section>

          {session.typeCompte === "collaborateur" ? (
            <section className="card p-4 sm:p-5 lg:col-span-2">
              <p className="kicker">Clôture</p>
              <h2 className="form-desk-title">Compte équipe</h2>
              <p className="muted mt-3 text-sm">
                Un compte contrôleur ou administrateur se ferme depuis le bureau, pas ici.
              </p>
            </section>
          ) : (
            <section className="card p-4 sm:p-5 lg:col-span-2">
              <p className="kicker">Clôture</p>
              <h2 className="form-desk-title">Fermer mon compte</h2>
              <p className="muted mt-3 mb-5 text-sm">
                Les dossiers ouverts doivent d’abord être clôturés. Pièces et OCR sont effacés du
                stockage ; e-mail et profil sont anonymisés (art. 17 RGPD).
              </p>
              <div className="flex items-start gap-3">
                <Shield size={18} strokeWidth={1.75} className="mt-1 shrink-0" />
                <FermerCompteForm />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
