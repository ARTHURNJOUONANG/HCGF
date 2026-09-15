import { CheckCircle2, Clock, Paperclip, PenLine, Wallet } from "lucide-react";
import { ControleDoc, SignatureForm, TacheForm, TerminerTache } from "@/components/Lot2";
import { RapprocherForm, TraiterRemboursement } from "@/components/Lot3";
import { libellePriorite, libelleStatutDoc } from "@/lib/labels";
import { euros, libelleFonds, libelleRemboursement } from "@/lib/finance";
import { SoftMetric } from "@/components/Surface";

type DocLite = { id: string; nom: string; statut: string };

export function BureauPieces({
  pieces,
}: {
  pieces: { id: string; libelle: string; obligatoire: boolean; docs: DocLite[] }[];
}) {
  const recus = pieces.filter((p) => p.docs.length > 0).length;

  return (
    <section className="piece-desk">
      <header className="piece-desk-head card">
        <div>
          <p className="kicker">Contrôle</p>
          <h2 className="form-desk-title">Pièces</h2>
        </div>
        <span className="rail-pct">
          {recus}/{pieces.length}
        </span>
      </header>
      <ul className="piece-list">
        {pieces.map((piece) => {
          const dernier = piece.docs[0];
          const etat = dernier?.statut ?? "vide";
          return (
            <li key={piece.id} className="piece-slot card" data-state={etat}>
              <div className="piece-slot-top">
                <span className="piece-ico" aria-hidden>
                  {etat === "conforme" || etat === "signe" ? (
                    <CheckCircle2 size={18} />
                  ) : etat === "vide" ? (
                    <Paperclip size={18} />
                  ) : (
                    <Clock size={18} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="piece-name">{piece.libelle}</h3>
                  <p className="piece-need">{piece.obligatoire ? "Obligatoire" : "Optionnel"}</p>
                </div>
                <span className={`pill ${etat === "conforme" || etat === "signe" ? "pill-ok" : etat === "vide" ? "" : "pill-hot"}`}>
                  {dernier ? libelleStatutDoc(dernier.statut) : "Manquant"}
                </span>
              </div>
              {piece.docs.length > 0 ? (
                <ul className="piece-files">
                  {piece.docs.map((d) => (
                    <li key={d.id}>
                      <div>
                        <a href={`/api/fichiers/${d.id}`}>{d.nom}</a>
                        <span>{libelleStatutDoc(d.statut)}</span>
                      </div>
                      <ControleDoc documentId={d.id} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="piece-empty">Aucune pièce déposée.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function BureauFinance({
  attendu,
  recu,
  statutFonds,
  operations,
  remboursements,
  pieces,
}: {
  attendu: number;
  recu: number;
  statutFonds: string;
  operations: { id: string; type: string; reference: string | null; montant: number; statut: string }[];
  remboursements: { id: string; statut: string; motif: string }[];
  pieces: { id: string; nom: string }[];
}) {
  return (
    <section className="rail-card card">
      <div className="rail-head">
        <div>
          <p className="kicker">Trésorerie</p>
          <h2 className="rail-title">Finance</h2>
        </div>
        <span className="rail-ico">
          <Wallet size={16} />
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        <SoftMetric label="Attendu" value={euros(attendu)} />
        <SoftMetric label="Reçu" value={euros(recu)} />
        <SoftMetric label="Statut" value={libelleFonds(statutFonds)} />
      </div>
      {operations.length > 0 ? (
        <ul className="pay-lines">
          {operations.map((op) => (
            <li key={op.id}>
              <span>
                {op.type} · {op.reference || "—"} · {euros(op.montant)}
              </span>
              {op.type === "virement" && op.statut === "en_attente" ? <RapprocherForm operationId={op.id} /> : <span>{op.statut}</span>}
            </li>
          ))}
        </ul>
      ) : null}
      {remboursements.map((r) => (
        <div key={r.id} className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>
            {libelleRemboursement(r.statut)} · {r.motif}
          </span>
          <TraiterRemboursement remboursementId={r.id} statut={r.statut} />
        </div>
      ))}
      {pieces.map((p) => (
        <p key={p.id} className="mt-3 text-sm">
          <a href={`/api/pieces-comptables/${p.id}`} className="link-blue">
            {p.nom}
          </a>
        </p>
      ))}
    </section>
  );
}

export function BureauSignature({
  demandeId,
  autorise,
  dejaSigne,
  controleRenforce = false,
}: {
  demandeId: string;
  autorise: boolean;
  dejaSigne: boolean;
  controleRenforce?: boolean;
}) {
  return (
    <section className="rail-card card">
      <div className="rail-head">
        <div>
          <p className="kicker">Validation</p>
          <h2 className="rail-title">Signature</h2>
        </div>
        <span className="rail-ico">
          <PenLine size={16} />
        </span>
      </div>
      <p className="rail-copy">Génère le dossier, archive une version et notifie le candidat.</p>
      {controleRenforce ? (
        <p className="hold-warn mt-3 text-sm">Alerte fraude ouverte — la signature est bloquée jusqu’à levée.</p>
      ) : null}
      <div className="mt-4">
        {dejaSigne ? (
          <p className="pill pill-ok">Déjà signé et disponible</p>
        ) : (
          <SignatureForm demandeId={demandeId} autorise={autorise && !controleRenforce} />
        )}
      </div>
    </section>
  );
}

export function BureauTaches({
  demandeId,
  taches,
}: {
  demandeId: string;
  taches: { id: string; action: string; priorite: string; statut: string }[];
}) {
  return (
    <section className="rail-card card">
      <div className="rail-head">
        <div>
          <p className="kicker">Interne</p>
          <h2 className="rail-title">Tâches</h2>
        </div>
      </div>
      <ul className="pay-lines">
        {taches.map((t) => (
          <li key={t.id}>
            <span>
              {t.action}
              <span className="muted"> · {libellePriorite(t.priorite)}</span>
            </span>
            {t.statut !== "termine" ? <TerminerTache tacheId={t.id} /> : <span className="pill pill-ok">Fait</span>}
          </li>
        ))}
      </ul>
      <TacheForm demandeId={demandeId} />
    </section>
  );
}

export function BureauAudit({
  audits,
}: {
  audits: { id: string; createdAt: Date; action: string; acteur?: { email: string } | null }[];
}) {
  return (
    <section className="rail-card card">
      <div className="rail-head">
        <div>
          <p className="kicker">Journal</p>
          <h2 className="rail-title">Audit</h2>
        </div>
      </div>
      <ul className="pay-lines">
        {audits.map((a) => (
          <li key={a.id}>
            <span>
              {a.acteur?.email ?? "système"} · {a.action}
            </span>
            <span className="muted">{a.createdAt.toLocaleString("fr-FR")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
