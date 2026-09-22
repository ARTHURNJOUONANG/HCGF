"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { connecter } from "@/lib/actions";
import { RolePicker } from "@/components/RolePicker";
import { espaceParId, roleExigeCode, type EspaceId } from "@/lib/espaces";

function valeurChamp(form: HTMLFormElement, nom: string) {
  const champ = form.elements.namedItem(nom);
  return champ instanceof HTMLInputElement ? champ.value : "";
}

function caseCochee(form: HTMLFormElement, nom: string) {
  const champ = form.elements.namedItem(nom);
  return champ instanceof HTMLInputElement && champ.checked;
}

export function LoginForm({
  roleInitial,
  politique,
}: {
  roleInitial?: string;
  politique: { version: string; contenu: string };
}) {
  const [role, setRole] = useState<EspaceId>(espaceParId(roleInitial).id);
  const [accepte, setAccepte] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const espace = espaceParId(role);

  return (
    <>
      <p className="kicker mt-5">Quel espace ?</p>
      <RolePicker value={role} onChange={setRole} />
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!caseCochee(event.currentTarget, "acceptConfidentialite")) {
            setError("Vous devez accepter la politique de confidentialité pour continuer.");
            return;
          }
          setPending(true);
          setError(null);
          const form = event.currentTarget;
          const result = await connecter({
            email: valeurChamp(form, "email"),
            password: valeurChamp(form, "password"),
            role,
            codeAcces: valeurChamp(form, "codeAcces"),
            acceptConfidentialite: true,
          });
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <label className="field">
          E-mail
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <input type="hidden" name="role" value={role} />
        <label className="field">
          Mot de passe
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {roleExigeCode(espace.id) ? (
          <label className="field">
            Code d’accès PD
            <input
              name="codeAcces"
              type="text"
              className="input"
              required
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              placeholder="PD-XXXXXXXX"
            />
          </label>
        ) : null}
        <p className="-mt-1 text-right">
          <Link href="/mot-de-passe" className="link-blue text-sm">
            Mot de passe oublié ?
          </Link>
        </p>

        <div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink)]">
            Politique de confidentialité · {politique.version}
          </p>
          <div className="mt-1.5 max-h-28 overflow-y-auto text-[11px] leading-snug text-[var(--muted)] whitespace-pre-wrap">
            {politique.contenu || "Politique indisponible — consultez /cgv."}
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--muted)]">
            Texte complet :{" "}
            <Link href="/cgv" className="link-blue" target="_blank" rel="noreferrer">
              /cgv
            </Link>
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-[var(--muted)]">
          <input
            name="acceptConfidentialite"
            type="checkbox"
            required
            className="mt-0.5"
            checked={accepte}
            onChange={(e) => setAccepte(e.target.checked)}
          />
          <span>
            J’ai lu et j’accepte la politique de confidentialité (obligatoire pour continuer).
          </span>
        </label>

        {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
        <button type="submit" disabled={pending || !accepte} className="btn btn-primary w-full">
          {pending ? "Ouverture…" : `Entrer comme ${espace.label.toLowerCase()}`}
          <ArrowRight size={16} />
        </button>
      </form>
    </>
  );
}
