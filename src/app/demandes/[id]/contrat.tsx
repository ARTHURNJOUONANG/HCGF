"use client";

import { useState } from "react";
import { Download, PenLine, ShieldCheck } from "lucide-react";
import { pushToast } from "@/components/Feedback";
import { signerContratAvi } from "@/lib/lot-contrat";

export function ContratBoard({
  demandeId,
  html,
  dejaSigne,
  canSign,
  documentId,
}: {
  demandeId: string;
  html: string;
  dejaSigne: boolean;
  canSign: boolean;
  documentId?: string;
}) {
  const [lu, setLu] = useState(dejaSigne);
  const [attente, setAttente] = useState(false);

  async function signer() {
    if (!lu) {
      pushToast("Cochez « Lu et approuvé » avant de signer.", "hot");
      return;
    }
    setAttente(true);
    const result = await signerContratAvi(demandeId);
    setAttente(false);
    if (result.error) pushToast(result.error, "hot");
    else pushToast("Contrat signé.", "ok");
  }

  return (
    <section className="card p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Contrat de prestations</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight">AVI — modèle officiel</h2>
          <p className="muted mt-2 text-sm">
            {dejaSigne
              ? "Signé électroniquement. L’AVI ne sera délivrée qu’après encaissement des fonds."
              : "Relisez les 4 pages, puis signez. Les champs jaunes viennent du formulaire."}
          </p>
        </div>
        {dejaSigne && documentId ? (
          <a href={`/api/fichiers/${documentId}`} className="icon-btn" aria-label="Télécharger" title="Télécharger">
            <Download size={18} />
          </a>
        ) : null}
      </header>

      {dejaSigne ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-[var(--blue-deep)]">
          <ShieldCheck size={18} /> Lu et approuvé — signature enregistrée
        </p>
      ) : canSign ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} />
            Lu et approuvé
          </label>
          <button type="button" className="btn" disabled={attente || !lu} onClick={signer}>
            <PenLine size={16} />
            {attente ? "Signature…" : "Signer le contrat"}
          </button>
        </div>
      ) : (
        <p className="muted mt-4 text-sm">Consultation seule. La signature n’est pas déléguée.</p>
      )}

      <iframe
        title="Contrat AVI"
        className="mt-5 w-full rounded-md border border-[var(--line)] bg-white"
        style={{ minHeight: "1100px" }}
        srcDoc={html}
      />
    </section>
  );
}
