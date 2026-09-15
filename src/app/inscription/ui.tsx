"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { inscrire } from "@/lib/actions";
import { RolePicker } from "@/components/RolePicker";
import { ChampCodeAcces } from "@/components/ChampCodeAcces";
import { ESPACES_INSCRIPTION, espaceParId, roleExigeCode, rolePublic, type EspaceId } from "@/lib/espaces";

export function RegisterForm({ roleInitial }: { roleInitial?: string }) {
  const [role, setRole] = useState<EspaceId>(rolePublic(espaceParId(roleInitial).id) ? espaceParId(roleInitial).id : "candidat");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const espace = espaceParId(role);

  return (
    <>
      <p className="kicker mt-8">Quel rôle ?</p>
      <RolePicker value={role} onChange={setRole} espaces={ESPACES_INSCRIPTION} />
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const result = await inscrire(new FormData(event.currentTarget));
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Prénom
            <input name="prenom" required />
          </label>
          <label className="field">
            Nom
            <input name="nom" required />
          </label>
        </div>
        {espace.id === "partenaire" ? (
          <>
            <label className="field">
              Organisme
              <input name="organisme" required />
            </label>
            <label className="field">
              Type
              <select name="typePartenaire" className="input" defaultValue="agence">
                <option value="agence">Agence</option>
                <option value="ecole">École</option>
                <option value="apporteur">Apporteur</option>
              </select>
            </label>
          </>
        ) : null}
        <label className="field">
          E-mail
          <input name="email" type="email" required />
        </label>
        <label className="field">
          Téléphone
          <input name="telephone" />
        </label>
        <label className="field">
          Mot de passe
          <input name="password" type="password" required minLength={10} />
        </label>
        {roleExigeCode(espace.id) ? <ChampCodeAcces /> : null}
        <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
          <input name="acceptCgv" type="checkbox" required className="mt-1" />
          <span>
            J’accepte les{" "}
            <a href="/cgv" className="link-blue" target="_blank" rel="noreferrer">
              CGV et la confidentialité
            </a>{" "}
            (version enregistrée).
          </span>
        </label>
        {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Création…" : `Créer l’espace ${espace.label.toLowerCase()}`}
          <ArrowRight size={16} />
        </button>
      </form>
    </>
  );
}
