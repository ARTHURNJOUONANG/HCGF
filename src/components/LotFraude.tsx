"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  analyserFraudeAction,
  confirmerAlerteFraudeAction,
  leverAlerteFraudeAction,
} from "@/lib/lot2";
import { pushToast } from "@/components/Feedback";

export function LeverAlerteForm({ alerteId }: { alerteId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const data = new FormData();
        data.set("alerteId", alerteId);
        const result = await leverAlerteFraudeAction(data);
        if (result && "error" in result && result.error) {
          pushToast(result.error, "hot");
        } else {
          pushToast("Alerte levée — signature de nouveau possible si plus aucun signal");
          router.refresh();
        }
        setPending(false);
      }}
    >
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Levée…" : "Lever"}
      </button>
    </form>
  );
}

export function ConfirmerAlerteForm({ alerteId }: { alerteId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const data = new FormData();
        data.set("alerteId", alerteId);
        const result = await confirmerAlerteFraudeAction(data);
        if (result && "error" in result && result.error) {
          pushToast(result.error, "hot");
        } else {
          pushToast("Signal confirmé — contrôle renforcé maintenu");
          router.refresh();
        }
        setPending(false);
      }}
    >
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "…" : "Confirmer"}
      </button>
    </form>
  );
}

export function AnalyserFraudeForm({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const data = new FormData();
        data.set("demandeId", demandeId);
        const result = await analyserFraudeAction(data);
        if (result && "error" in result && result.error) {
          pushToast(result.error, "hot");
        } else {
          const n = "count" in result ? result.count : 0;
          pushToast(n ? `${n} signal(s) trouvé(s)` : "Aucun nouveau signal");
          router.refresh();
        }
        setPending(false);
      }}
    >
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Analyse…" : "Relancer l’analyse"}
      </button>
    </form>
  );
}
