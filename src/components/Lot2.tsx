"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CircleAlert, PenLine, Plus, RefreshCw, Send, Upload } from "lucide-react";
import {
  controlerDocument,
  creerTache,
  deposerDocument,
  envoyerMessage,
  signerEtValider,
  terminerTache,
  abandonnerDemande,
  cloturerDemande,
} from "@/lib/lot2";
import { pushToast } from "@/components/Feedback";
export { LeverAlerteForm, ConfirmerAlerteForm, AnalyserFraudeForm } from "@/components/LotFraude";

export function UploadPiece({
  demandeId,
  pieceId,
  libelle,
}: {
  demandeId: string;
  pieceId: string;
  libelle: string;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState("");
  const [fichier, setFichier] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="dropzone-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setEtat("");
        const result = await deposerDocument(new FormData(event.currentTarget));
        setEtat(result.error ?? "Déposé");
        setPending(false);
        if (!result.error) {
          if ("fraudeDetectee" in result && result.fraudeDetectee) {
            pushToast("Fraude détectée : même pièce déjà vue sur un autre dossier — contrôle renforcé", "hot");
            setEtat("Déposé · signal fraude");
          } else {
            pushToast("Pièce déposée");
          }
          event.currentTarget.reset();
          setFichier("");
          router.refresh();
        } else {
          pushToast(result.error, "hot");
        }
      }}
    >
      <input type="hidden" name="demandeId" value={demandeId} />
      <input type="hidden" name="pieceId" value={pieceId} />
      <label className="dropzone">
        <input
          type="file"
          name="fichier"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required
          aria-label={`Déposer ${libelle}`}
          onChange={(event) => setFichier(event.target.files?.[0]?.name ?? "")}
        />
        <Upload size={16} />
        <span>{fichier || "PDF, JPG ou PNG — max 2,5 Go · images nettes requises"}</span>
      </label>
      <button type="submit" disabled={pending} className="btn btn-ghost !min-h-10">
        {pending ? "Envoi…" : "Déposer"}
      </button>
      {etat ? <span className="text-xs muted">{etat}</span> : null}
    </form>
  );
}

export function MessageBox({
  demandeId,
  placeholder = "Écrire à l’équipe…",
}: {
  demandeId: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="composer"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const form = event.currentTarget;
        const result = await envoyerMessage(new FormData(form));
        setPending(false);
        if (result.error) setError(result.error);
        else {
          form.reset();
          pushToast("Message envoyé");
          router.refresh();
        }
      }}
    >
      <input type="hidden" name="demandeId" value={demandeId} />
      <textarea
        name="contenu"
        required
        rows={2}
        aria-label="Message"
        placeholder={placeholder}
        className="composer-field"
      />
      <button type="submit" disabled={pending} className="composer-send" aria-label="Envoyer" title="Envoyer">
        <Send size={16} />
      </button>
      {error ? <p className="w-full text-sm text-[#c93400]">{error}</p> : null}
    </form>
  );
}

export function ControleDoc({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function apply(statut: string) {
    const data = new FormData();
    data.set("documentId", documentId);
    data.set("statut", statut);
    const result = await controlerDocument(data);
    if (result.error) {
      setError(result.error);
      pushToast(result.error, "hot");
    } else {
      if ("fraudeDetectee" in result && result.fraudeDetectee) {
        pushToast("Fraude détectée sur cette pièce — contrôle renforcé activé", "hot");
      }
      router.refresh();
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className="icon-btn" title="Conforme" aria-label="Conforme" onClick={() => apply("conforme")}>
        <Check size={16} />
      </button>
      <button type="button" className="icon-btn" title="À vérifier" aria-label="À vérifier" onClick={() => apply("a_verifier")}>
        <CircleAlert size={16} />
      </button>
      <button type="button" className="icon-btn" title="À remplacer" aria-label="À remplacer" onClick={() => apply("a_remplacer")}>
        <RefreshCw size={16} />
      </button>
      {error ? <span className="text-xs text-[#c93400]">{error}</span> : null}
    </div>
  );
}

export function SignatureForm({ demandeId, autorise }: { demandeId: string; autorise: boolean }) {
  const router = useRouter();
  const [etat, setEtat] = useState("");
  const [pending, setPending] = useState(false);

  if (!autorise) {
    return <p className="text-sm text-[#6e6e73]">La signature est réservée à l’administrateur.</p>;
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const data = new FormData();
        data.set("demandeId", demandeId);
        const result = await signerEtValider(data);
        setEtat("error" in result && result.error ? result.error : "Dossier signé et mis à disposition.");
        setPending(false);
        if (!("error" in result && result.error)) router.refresh();
      }}
    >
      <button type="submit" disabled={pending} className="btn btn-primary">
        <PenLine size={16} />
        {pending ? "Signature…" : "Signer"}
      </button>
      {etat ? <p className="mt-3 text-sm">{etat}</p> : null}
    </form>
  );
}

export function TacheForm({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-4 flex flex-wrap gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        await creerTache(new FormData(event.currentTarget));
        setPending(false);
        event.currentTarget.reset();
        router.refresh();
      }}
    >
      <input type="hidden" name="demandeId" value={demandeId} />
      <input name="action" required placeholder="Tâche" className="input flex-1" aria-label="Tâche" />
      <select name="priorite" className="input w-32" aria-label="Priorité">
        <option value="normal">Normal</option>
        <option value="prioritaire">Prioritaire</option>
        <option value="urgent">Urgent</option>
      </select>
      <button type="submit" disabled={pending} className="icon-btn" aria-label="Créer" title="Créer">
        <Plus size={18} />
      </button>
    </form>
  );
}

export function TerminerTache({ tacheId }: { tacheId: string }) {
  const router = useRouter();
  return (
    <form
      action={async (formData) => {
        await terminerTache(formData);
        router.refresh();
      }}
    >
      <input type="hidden" name="tacheId" value={tacheId} />
      <button type="submit" className="icon-btn" aria-label="Terminer" title="Terminer">
        <Check size={16} />
      </button>
    </form>
  );
}

export function AbandonnerDossierForm({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="mt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const data = new FormData();
        data.set("demandeId", demandeId);
        const result = await abandonnerDemande(data);
        if (result && "error" in result && result.error) {
          setError(result.error);
          pushToast(result.error, "hot");
        } else {
          pushToast("Dossier abandonné");
          router.refresh();
        }
        setPending(false);
      }}
    >
      {error ? <p className="mb-2 text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Abandon…" : "Abandonner ce dossier"}
      </button>
    </form>
  );
}

export function CloturerDossierForm({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const data = new FormData();
        data.set("demandeId", demandeId);
        const result = await cloturerDemande(data);
        if (result && "error" in result && result.error) {
          pushToast(result.error, "hot");
        } else {
          pushToast("Dossier clôturé");
          router.refresh();
        }
        setPending(false);
      }}
    >
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Clôture…" : "Clôturer le dossier"}
      </button>
    </form>
  );
}
