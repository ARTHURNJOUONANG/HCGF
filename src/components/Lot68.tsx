"use client";

import { useState } from "react";
import { ouvrirDelegation, revoquerDelegation } from "@/lib/lot6";
import {
  changerPriorite,
  changerStatutReclamation,
  ecrireMessageSav,
  executerRelances,
  ouvrirReclamation,
} from "@/lib/lot8";
import { DROITS_DELEGABLES } from "@/lib/droits";
import { libelleSav } from "@/lib/labels";
import { pushToast } from "@/components/Feedback";

export function DelegationForm({
  demandes,
}: {
  demandes: { id: string; reference: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setOk(false);
        const result = await ouvrirDelegation(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          pushToast(result.error, "hot");
        } else {
          setOk(true);
          event.currentTarget.reset();
          pushToast("Délégation ouverte");
        }
        setPending(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Prénom
          <input name="prenom" className="input" required />
        </label>
        <label className="field">
          Nom
          <input name="nom" className="input" required />
        </label>
      </div>
      <label className="field">
        E-mail du tiers
        <input name="email" type="email" className="input" required />
      </label>
      <label className="field">
        Périmètre
        <select name="demandeId" className="input">
          <option value="">Tout le compte</option>
          {demandes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.reference}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Fin (optionnel)
        <input name="dateFin" type="date" className="input" />
      </label>
      <fieldset>
        <legend className="kicker mb-2">Droits délégués</legend>
        <div className="right-chips">
          {DROITS_DELEGABLES.map(([code, label]) => (
            <label key={code} className="right-chip">
              <input type="checkbox" name={code} defaultChecked={code !== "payer"} />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#86868b]">Signature, identité et suppression ne sont jamais déléguables.</p>
      </fieldset>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      {ok ? <p className="text-sm text-[#1d7a46]">Délégation ouverte. Le tiers a été notifié.</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Envoi…" : "Autoriser"}
      </button>
    </form>
  );
}

export function RevoquerForm({ delegationId }: { delegationId: string }) {
  return (
    <form
      action={async (formData) => {
        await revoquerDelegation(formData);
      }}
    >
      <input type="hidden" name="delegationId" value={delegationId} />
      <button className="btn btn-ghost !min-h-9 !px-3 text-[13px]">Révoquer</button>
    </form>
  );
}

export function ReclamationForm({ demandeId }: { demandeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="support-fields"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setOk(false);
        const result = await ouvrirReclamation(new FormData(event.currentTarget));
        if (result?.error) setError(result.error);
        else setOk(true);
        setPending(false);
      }}
    >
      <input type="hidden" name="demandeId" value={demandeId} />
      <label className="field">
        Catégorie
        <select name="categorie" className="input">
          {[
            ["document", "Document"],
            ["paiement", "Paiement"],
            ["AVI", "AVI"],
            ["hebergement", "Hébergement"],
            ["assurance", "Assurance"],
            ["vol", "Vol"],
            ["technique", "Technique"],
            ["autre", "Autre"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Objet
        <input name="objet" className="input" required />
      </label>
      <label className="field">
        Message
        <textarea name="message" className="input min-h-[88px] py-3" required />
      </label>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      {ok ? <p className="text-sm text-[#1d7a46]">Réclamation ouverte.</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Envoi…" : "Envoyer la réclamation"}
      </button>
    </form>
  );
}

export function PrioriteForm({ demandeId, valeur }: { demandeId: string; valeur: string }) {
  return (
    <form action={changerPriorite} className="flex items-center gap-2">
      <input type="hidden" name="demandeId" value={demandeId} />
      <select name="priorite" defaultValue={valeur} className="input !min-h-9">
        <option value="normal">Standard</option>
        <option value="prioritaire">Prioritaire</option>
        <option value="urgent">Urgent</option>
      </select>
      <button className="btn btn-ghost !min-h-9 !px-3 text-[13px]">SLA</button>
    </form>
  );
}

export function RelancerForm() {
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await executerRelances();
        if (result && "creees" in result) {
          const canal =
            result.mails > 0
              ? "e-mail envoyé"
              : result.journal > 0
                ? "e-mail en journal (Resend non branché)"
                : "aucune relance due";
          setInfo(`${result.creees} relance(s) · ${canal}`);
        } else if (result?.error) setInfo(result.error);
        setPending(false);
      }}
    >
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Envoi…" : "Exécuter les relances dues"}
      </button>
      {info ? <p className="mt-2 text-sm text-[#6e6e73]">{info}</p> : null}
    </form>
  );
}

export function StatutSavForm({ reclamationId, statut }: { reclamationId: string; statut: string }) {
  return (
    <form action={changerStatutReclamation} className="flex items-center gap-2">
      <input type="hidden" name="reclamationId" value={reclamationId} />
      <select name="statut" defaultValue={statut} className="input !min-h-9">
        {["ouverte", "en_cours", "attente_candidat", "resolue", "fermee"].map((s) => (
            <option key={s} value={s}>
              {libelleSav(s)}
            </option>
          ))}
      </select>
      <button className="btn btn-ghost !min-h-9 !px-3 text-[13px]">Maj</button>
    </form>
  );
}

export function MessageSavForm({ reclamationId }: { reclamationId: string }) {
  return (
    <form action={ecrireMessageSav} className="mt-2 flex gap-2">
      <input type="hidden" name="reclamationId" value={reclamationId} />
      <input name="contenu" className="input flex-1" placeholder="Réponse SAV" required />
      <button className="btn btn-primary !min-h-9 !px-3 text-[13px]">Envoyer</button>
    </form>
  );
}
