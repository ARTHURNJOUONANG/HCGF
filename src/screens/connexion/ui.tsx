"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { connecter } from "@/lib/action-binds";
import { roleExigeCode } from "@/lib/espaces";

type Politique = { version: string; contenu: string };

/**
 * Connexion en une étape pour la plupart des comptes :
 * l’espace (candidat, équipe, partenaire, délégataire) est déduit du compte.
 * Le code d’accès équipe et la politique de confidentialité ne sont demandés
 * que lorsqu’ils s’appliquent (compte équipe, nouvelle version de la politique).
 */
export function LoginForm({ roleInitial }: { roleInitial?: string }) {
  const [etape, setEtape] = useState<"identifiants" | "code" | "politique">(
    roleInitial && roleExigeCode(roleInitial) ? "code" : "identifiants",
  );
  const [politique, setPolitique] = useState<Politique | null>(null);
  // Une fois demandé, le code reste affiché (et envoyé) aux étapes suivantes, dont la politique.
  const [codeRequis, setCodeRequis] = useState(etape === "code");
  const [accepte, setAccepte] = useState(false);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const champCode = useRef<HTMLInputElement>(null);

  return (
    <form
      className="login-form mt-6 space-y-4"
      noValidate={false}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const valeur = (nom: string) => {
          const champ = form.elements.namedItem(nom);
          return champ instanceof HTMLInputElement ? champ.value : "";
        };
        if (etape === "politique" && !accepte) {
          setError("Merci d’accepter la politique de confidentialité pour continuer.");
          return;
        }
        setPending(true);
        setError(null);
        const result = await connecter({
          email: valeur("email"),
          password: valeur("password"),
          role: roleInitial ?? "",
          codeAcces: valeur("codeAcces"),
          acceptConfidentialite: etape === "politique" ? accepte : false,
        });
        setPending(false);
        if (!result) return;
        if ("etape" in result && result.etape === "code") {
          setEtape("code");
          setCodeRequis(true);
          setError(result.error ?? null);
          requestAnimationFrame(() => champCode.current?.focus());
          return;
        }
        if ("etape" in result && result.etape === "politique") {
          setPolitique(result.politique);
          setEtape("politique");
          return;
        }
        if ("error" in result && result.error) setError(result.error);
      }}
    >
      <label className="field">
        E-mail
        <input name="email" type="email" required autoComplete="email" autoFocus inputMode="email" />
      </label>
      <label className="field">
        Mot de passe
        <span className="password-wrap">
          <input
            name="password"
            type={voirMotDePasse ? "text" : "password"}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setVoirMotDePasse((v) => !v)}
            aria-label={voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {voirMotDePasse ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {etape === "code" || codeRequis ? (
        <label className="field login-step">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound size={14} /> Code d’accès équipe
          </span>
          <input
            ref={champCode}
            name="codeAcces"
            type="text"
            className="input"
            required
            autoComplete="one-time-code"
            spellCheck={false}
            autoCapitalize="characters"
            placeholder="PD-XXXXXXXX"
          />
          <small className="login-hint">Compte équipe : saisissez le code transmis par votre administrateur.</small>
        </label>
      ) : (
        <input type="hidden" name="codeAcces" value="" />
      )}

      {etape === "politique" && politique ? (
        <div className="login-step login-policy">
          <p className="login-policy-title">
            <ShieldCheck size={16} /> Politique de confidentialité · {politique.version}
          </p>
          <p className="login-hint">Elle a été mise à jour depuis votre dernière visite.</p>
          <details>
            <summary>Lire la politique</summary>
            <div className="login-policy-body">{politique.contenu}</div>
          </details>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepte}
              onChange={(e) => setAccepte(e.target.checked)}
              className="mt-0.5"
            />
            <span>J’ai lu et j’accepte la politique de confidentialité.</span>
          </label>
        </div>
      ) : null}

      <p className="-mt-1 text-right">
        <Link href="/mot-de-passe" className="link-blue text-sm">
          Mot de passe oublié ?
        </Link>
      </p>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? (
          <>
            <Loader2 size={16} className="spin" /> Connexion…
          </>
        ) : (
          <>
            {etape === "politique" ? "Accepter et continuer" : "Se connecter"}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
