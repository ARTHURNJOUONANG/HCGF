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

export function LoginForm({ roleInitial }: { roleInitial?: string }) {
  const [role, setRole] = useState<EspaceId>(espaceParId(roleInitial).id);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const espace = espaceParId(role);

  return (
    <>
      <p className="kicker mt-8">Quel espace ?</p>
      <RolePicker value={role} onChange={setRole} />
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = event.currentTarget;
          const result = await connecter({
            email: valeurChamp(form, "email"),
            password: valeurChamp(form, "password"),
            role,
            codeAcces: valeurChamp(form, "codeAcces"),
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
        <label className="field">
          Code d’accès PD
          <input
            name="codeAcces"
            type="text"
            className="input"
            required={roleExigeCode(espace.id)}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
          />
        </label>
        <p className="-mt-1 text-right">
          <Link href="/mot-de-passe" className="link-blue text-sm">
            Mot de passe oublié ?
          </Link>
        </p>
        {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Ouverture…" : `Entrer comme ${espace.label.toLowerCase()}`}
          <ArrowRight size={16} />
        </button>
      </form>
    </>
  );
}
