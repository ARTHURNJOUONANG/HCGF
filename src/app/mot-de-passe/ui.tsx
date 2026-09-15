"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { demanderReinitialisation, definirNouveauMotDePasse } from "@/lib/mot-de-passe";

export function DemandeResetForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  if (envoye) {
    return (
      <div className="mt-8 space-y-5">
        <p className="text-[15px] leading-relaxed text-[var(--muted)]">
          Si un compte est associé à cette adresse, un lien valable une heure a été envoyé. Le message
          est le même dans tous les cas, pour ne pas révéler qui a un espace.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await demanderReinitialisation(new FormData(event.currentTarget));
        if ("error" in result && result.error) {
          setError(result.error);
          setPending(false);
          return;
        }
        if ("ok" in result && result.ok) {
          setEnvoye(true);
        }
        setPending(false);
      }}
    >
      <label className="field">
        E-mail du compte
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Envoi…" : "Recevoir le lien"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function NouveauMotDePasseForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await definirNouveauMotDePasse(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="token" value={token} />
      <label className="field">
        Nouveau mot de passe
        <input name="password" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label className="field">
        Confirmer
        <input name="confirmation" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Enregistrement…" : "Enregistrer et ouvrir"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
