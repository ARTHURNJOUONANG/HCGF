import type { ReactNode } from "react";
import { CheckCircle2, Circle, Clock, LifeBuoy, MessageCircle } from "lucide-react";
import { ReclamationForm } from "@/components/Lot68";
import { AbandonnerDossierForm } from "@/components/Lot2";

const STATUT_CHECK: Record<string, string> = {
  termine: "Fait",
  en_attente: "En cours",
  a_venir: "À venir",
};

export function Thread({
  messages,
  selfId,
  composer,
  kicker = "Dossier",
  title = "Conversation",
  badge = "Réponse sous 24 h",
  emptyTitle = "Écrivez à l’équipe",
  emptyText = "Posez une question sur une pièce, un paiement ou une étape. Le fil reste attaché à ce dossier.",
}: {
  messages: { id: string; contenu: string; createdAt: Date; idAuteur: string; auteurNom: string }[];
  selfId: string;
  composer?: ReactNode;
  kicker?: string;
  title?: string;
  badge?: string;
  emptyTitle?: string;
  emptyText?: string;
}) {
  return (
    <section className="thread card">
      <header className="thread-head">
        <div>
          <p className="kicker">{kicker}</p>
          <h2 className="thread-title">{title}</h2>
        </div>
        {badge ? <span className="thread-badge">{badge}</span> : null}
      </header>
      <div className="thread-body">
        {messages.length === 0 ? (
          <div className="thread-empty">
            <span className="thread-empty-icon">
              <MessageCircle size={22} strokeWidth={1.6} />
            </span>
            <p className="thread-empty-title">{emptyTitle}</p>
            <p className="thread-empty-text">{emptyText}</p>
          </div>
        ) : (
          <ul className="thread-list">
            {messages.map((m) => {
              const mine = m.idAuteur === selfId;
              return (
                <li key={m.id} className={`bubble${mine ? " is-mine" : ""}`}>
                  <p className="bubble-meta">
                    {mine ? "Vous" : m.auteurNom}
                    <span>{m.createdAt.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </p>
                  <p className="bubble-text">{m.contenu}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {composer ? <footer className="thread-foot">{composer}</footer> : null}
    </section>
  );
}

export function ChecklistRail({
  items,
}: {
  items: { id: string; libelle: string; statut: string }[];
}) {
  const faits = items.filter((i) => i.statut === "termine").length;
  const total = Math.max(items.length, 1);
  const pct = Math.round((faits / total) * 100);

  return (
    <section className="rail-card card">
      <div className="rail-head">
        <div>
          <p className="kicker">Avancement</p>
          <h2 className="rail-title">Checklist</h2>
        </div>
        <span className="rail-pct">{pct}%</span>
      </div>
      <div className="progress mt-4">
        <span style={{ width: `${pct}%` }} />
      </div>
      <ol className="track">
        {items.map((item, i) => (
          <li key={item.id} className="track-item" data-state={item.statut}>
            <span className="track-mark" aria-hidden>
              {item.statut === "termine" ? (
                <CheckCircle2 size={16} />
              ) : item.statut === "en_attente" ? (
                <Clock size={16} />
              ) : (
                <Circle size={16} />
              )}
              {i < items.length - 1 ? <i /> : null}
            </span>
            <div>
              <p className="track-label">{item.libelle}</p>
              <p className="track-state">{STATUT_CHECK[item.statut] ?? item.statut}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SupportRail({
  demandeId,
  peutAbandonner = false,
}: {
  demandeId: string;
  peutAbandonner?: boolean;
}) {
  return (
    <section className="rail-card card">
      <div className="rail-head rail-head-start">
        <span className="rail-ico">
          <LifeBuoy size={16} />
        </span>
        <div>
          <p className="kicker">Assistance</p>
          <h2 className="rail-title">Un problème ?</h2>
        </div>
      </div>
      <p className="rail-copy">
        Ouvrez une réclamation seulement si le fil de discussion ne suffit pas. L’équipe reprend le dossier.
      </p>
      <details className="support-fold">
        <summary>Ouvrir une réclamation</summary>
        <div className="support-form">
          <ReclamationForm demandeId={demandeId} />
        </div>
      </details>
      {peutAbandonner ? <AbandonnerDossierForm demandeId={demandeId} /> : null}
    </section>
  );
}
