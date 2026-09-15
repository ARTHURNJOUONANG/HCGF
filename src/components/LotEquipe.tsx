"use client";

import { useState } from "react";
import { creerCollaborateur, creerComptePartenaire } from "@/lib/equipe";
import { pushToast } from "@/components/Feedback";

function LienAcces({ lien }: { lien: string | null }) {
  if (!lien) return null;
  return (
    <p className="muted mt-3 text-sm break-all">
      Lien d’accès (valable 1 heure) :{" "}
      <a href={lien} className="link-blue">
        {lien}
      </a>
    </p>
  );
}

export function CreerCollaborateurForm() {
  const [error, setError] = useState<string | null>(null);
  const [lien, setLien] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setLien(null);
        const result = await creerCollaborateur(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          pushToast(result.error, "hot");
        } else {
          setLien(result.lien);
          event.currentTarget.reset();
          pushToast("Compte équipe créé");
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
        E-mail
        <input name="email" type="email" className="input" required />
      </label>
      <label className="field">
        Rôle
        <select name="role" className="input" defaultValue="conseiller">
          <option value="conseiller">Conseiller</option>
          <option value="signataire">Signataire</option>
        </select>
      </label>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Création…" : "Créer le compte"}
      </button>
      <LienAcces lien={lien} />
    </form>
  );
}

export function CreerPartenaireForm() {
  const [error, setError] = useState<string | null>(null);
  const [lien, setLien] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setLien(null);
        const result = await creerComptePartenaire(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          pushToast(result.error, "hot");
        } else {
          setLien(result.lien);
          event.currentTarget.reset();
          pushToast("Compte partenaire créé");
        }
        setPending(false);
      }}
    >
      <label className="field">
        Organisme
        <input name="organisme" className="input" required />
      </label>
      <label className="field">
        Type
        <select name="type" className="input" defaultValue="agence">
          <option value="agence">Agence</option>
          <option value="ecole">École</option>
          <option value="apporteur">Apporteur</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Taux (%)
          <input name="taux" type="number" min={0} max={100} className="input" defaultValue={0} />
        </label>
        <label className="field">
          Fixe (€)
          <input name="montantFixe" type="number" min={0} step="0.01" className="input" defaultValue={0} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Prénom de l’agent
          <input name="prenom" className="input" required />
        </label>
        <label className="field">
          Nom de l’agent
          <input name="nom" className="input" required />
        </label>
      </div>
      <label className="field">
        E-mail de l’agent
        <input name="email" type="email" className="input" required />
      </label>
      {error ? <p className="text-sm text-[#c93400]">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Création…" : "Créer le partenaire"}
      </button>
      <LienAcces lien={lien} />
    </form>
  );
}
