import type { ReactNode } from "react";
import { CheckCircle2, Clock, FileWarning, Paperclip } from "lucide-react";
import { UploadPiece } from "@/components/Lot2";
import { RemboursementForm } from "@/components/Lot3";
import { SelecteurPaiement } from "@/components/SelecteurPaiement";
import type { etatMoyensPaiement } from "@/lib/moyens-paiement";
import { libelleStatutDoc } from "@/lib/labels";
import { euros, libelleFonds, libelleRemboursement } from "@/lib/finance";
import { SoftMetric } from "@/components/Surface";

type DocLite = { id: string; nom: string; statut: string };

export function PiecesBoard({
  demandeId,
  pieces,
  canUpload,
}: {
  demandeId: string;
  pieces: {
    id: string;
    libelle: string;
    obligatoire: boolean;
    typePiece?: string;
    docs: DocLite[];
  }[];
  canUpload: boolean;
}) {
  const faits = pieces.filter((p) => p.docs.some((d) => d.statut === "conforme" || d.statut === "recu" || d.statut === "signe")).length;

  return (
    <section className="piece-desk">
      <header className="piece-desk-head card">
        <div>
          <p className="kicker">Pièces du dossier</p>
          <h2 className="form-desk-title">Documents à déposer</h2>
          <p className="muted mt-2 text-sm">PDF, JPG ou PNG. Chaque pièce reste isolée de ce dossier.</p>
        </div>
        <span className="rail-pct">
          {faits}/{pieces.length}
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
                  ) : etat === "a_remplacer" ? (
                    <FileWarning size={18} />
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
                      <a href={`/api/fichiers/${d.id}`}>{d.nom}</a>
                      <span>{libelleStatutDoc(d.statut)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="piece-empty">Aucun fichier pour le moment.</p>
              )}
              {canUpload ? <UploadPiece demandeId={demandeId} pieceId={piece.id} libelle={piece.libelle} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PaiementBoard({
  demandeId,
  reference,
  iban,
  attendu,
  recu,
  statutFonds,
  tarif,
  operations,
  pieces,
  remboursements,
  canPay,
  moyens = { paypal: "demo", orange_money: "demo", mtn_money: "demo", wero: "demo", virement: "bureau" },
  payRetour,
}: {
  demandeId: string;
  reference: string;
  iban: string;
  attendu: number;
  recu: number;
  statutFonds: string;
  tarif?: { versionBareme: string; montantAccepte: number; frais: number } | null;
  operations: { id: string; type: string; reference: string | null; idTransaction: string | null; montant: number; statut: string }[];
  pieces: { id: string; nom: string; montant: number }[];
  remboursements: { id: string; statut: string; motif: string }[];
  canPay: boolean;
  moyens?: ReturnType<typeof etatMoyensPaiement>;
  payRetour?: string;
}) {
  const solde = statutFonds !== "fonds_recus" && statutFonds !== "rembourse";

  return (
    <section className="pay-desk">
      <header className="piece-desk-head card">
        <div>
          <p className="kicker">Espace financier</p>
          <h2 className="form-desk-title">Paiement</h2>
          <p className="muted mt-2 text-sm">
            Le tarif accepté à l’ouverture ne change plus, même si le barème évolue.
          </p>
        </div>
      </header>

      <div className="stagger grid gap-3 sm:grid-cols-3">
        <SoftMetric label="Attendu" value={euros(attendu)} />
        <SoftMetric label="Reçu" value={euros(recu)} />
        <SoftMetric label="Statut" value={libelleFonds(statutFonds)} />
      </div>
      {payRetour === "ok" ? <p className="pay-bareme">Paiement confirmé. Le reçu est dans ce dossier.</p> : null}
      {payRetour === "annule" ? <p className="pay-bareme">Paiement annulé. Vous pouvez réessayer ou payer par virement.</p> : null}
      {tarif ? (
        <p className="pay-bareme">
          Barème {tarif.versionBareme} · service {euros(tarif.montantAccepte)} · frais {euros(tarif.frais)}
        </p>
      ) : null}

      {solde && canPay ? (
        <SelecteurPaiement demandeId={demandeId} reference={reference} iban={iban} moyens={moyens} />
      ) : null}

      {operations.length > 0 ? (
        <section className="card p-5">
          <h3 className="panel-title">Opérations</h3>
          <ul className="pay-lines">
            {operations.map((op) => (
              <li key={op.id}>
                <span>
                  {op.type} · {op.reference || op.idTransaction || "—"}
                </span>
                <span>
                  {euros(op.montant)} · {op.statut}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pieces.length > 0 ? (
        <section className="card p-5">
          <h3 className="panel-title">Pièces comptables</h3>
          <ul className="pay-lines">
            {pieces.map((p) => (
              <li key={p.id}>
                <a href={`/api/pieces-comptables/${p.id}`} className="link-blue">
                  {p.nom}
                </a>
                <span>{euros(p.montant)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {statutFonds === "fonds_recus" ? (
        <section className="card p-5">
          <h3 className="panel-title">Remboursement</h3>
          <p className="mt-2 text-sm muted">Jamais automatique : l’équipe vérifie d’abord le motif.</p>
          <RemboursementForm demandeId={demandeId} />
        </section>
      ) : null}

      {remboursements.length > 0 ? (
        <ul className="pay-lines card p-5">
          {remboursements.map((r) => (
            <li key={r.id}>
              {libelleRemboursement(r.statut)} · {r.motif}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function ConsultationSeule({ children }: { children: ReactNode }) {
  return <section className="card p-6 text-sm muted">{children}</section>;
}
