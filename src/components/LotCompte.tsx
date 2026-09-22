"use client";

import { useState } from "react";
import { fermerMonCompte, revoquerAutresSessions } from "@/lib/rgpd-actions";
import { pushToast } from "@/components/Feedback";

export function RevoquerSessionsForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await revoquerAutresSessions();
        if (result && "error" in result && result.error) {
          setError(result.error);
          pushToast(result.error, "hot");
        } else {
          pushToast("Les autres sessions ont été fermées");
        }
        setPending(false);
      }}
    >
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Fermeture…" : "Fermer les autres sessions"}
      </button>
    </form>
  );
}

export function FermerCompteForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await fermerMonCompte(new FormData(event.currentTarget));
        if (result && "error" in result && result.error) {
          setError(result.error);
          pushToast(result.error, "hot");
          setPending(false);
        }
      }}
    >
      <label className="field">
        Tapez FERMER pour confirmer
        <input name="confirmation" className="input" autoComplete="off" required />
      </label>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Clôture…" : "Fermer mon compte"}
      </button>
    </form>
  );
}
