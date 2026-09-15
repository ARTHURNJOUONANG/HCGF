"use client";

import { useMemo, useState } from "react";
import { ArrowRight, FileCheck, Home, Plane, Shield } from "lucide-react";
import { initierDossierPartenaire, payerCommission } from "@/lib/lot5";
import { Drapeau } from "@/components/Pays";

type OffreLite = {
  pays: string;
  service: string;
  texte: string;
  paysLibelle: string;
  serviceLibelle: string;
};

const icons: Record<string, typeof FileCheck> = {
  AVI: FileCheck,
  ASSURANCE: Shield,
  HEBERGEMENT: Home,
  VOL: Plane,
};

export function InitierDossierForm({
  pays,
  services,
  offres,
}: {
  pays: { code: string; libelle: string }[];
  services: { code: string; libelle: string }[];
  offres: OffreLite[];
}) {
  const [service, setService] = useState("AVI");
  const [paysCode, setPaysCode] = useState("FR");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const offre = useMemo(
    () => offres.find((o) => o.service === service && o.pays === paysCode),
    [offres, service, paysCode],
  );

  const paysDispo = pays.filter((p) =>
    offres.some((o) => o.service === service && o.pays === p.code),
  );

  return (
    <form
      className="open-desk"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await initierDossierPartenaire(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <section className="open-step">
        <p className="kicker">1 · Candidat</p>
        <div className="form-grid">
          <label className="field">
            Prénom
            <input name="prenom" className="input" required placeholder="Prénom" />
          </label>
          <label className="field">
            Nom
            <input name="nom" className="input" required placeholder="Nom" />
          </label>
          <label className="field is-wide">
            E-mail
            <input name="email" type="email" className="input" required placeholder="adresse e-mail" />
          </label>
        </div>
        <p className="muted mt-3 text-sm">
          Le candidat reçoit un message pour compléter son dossier. S’il n’a pas de compte, un lien lui est envoyé pour en créer un.
        </p>
      </section>

      <section className="open-step">
        <p className="kicker">2 · Service</p>
        <div className="open-services">
          {services.map((s) => {
            const Icon = icons[s.code] ?? FileCheck;
            return (
              <label key={s.code} className="pick-card" data-on={String(service === s.code)}>
                <input
                  type="radio"
                  name="service"
                  value={s.code}
                  checked={service === s.code}
                  onChange={() => {
                    setService(s.code);
                    const premier = offres.find((o) => o.service === s.code);
                    if (premier) setPaysCode(premier.pays);
                  }}
                />
                <span className="rail-ico" aria-hidden>
                  <Icon size={16} />
                </span>
                <span>
                  <strong>{s.libelle}</strong>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="open-step">
        <p className="kicker">3 · Destination</p>
        <div className="pays-pick">
          {paysDispo.map((p) => (
            <label key={p.code} data-on={String(paysCode === p.code)}>
              <input
                type="radio"
                name="pays"
                value={p.code}
                checked={paysCode === p.code}
                onChange={() => setPaysCode(p.code)}
              />
              <Drapeau code={p.code} size="lg" />
              <span className="font-medium">{p.libelle}</span>
            </label>
          ))}
        </div>
      </section>

      <aside className="open-recap card">
        {offre ? (
          <>
            <p className="kicker">Récapitulatif</p>
            <p className="open-recap-title">
              {offre.serviceLibelle}
              <Drapeau code={offre.pays} />
              {offre.paysLibelle}
            </p>
            <p className="muted mt-2 text-sm leading-6">{offre.texte}</p>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--warn)" }}>
            Cette combinaison n’est pas ouverte.
          </p>
        )}
        {error ? (
          <p className="mt-3 text-sm" style={{ color: "var(--warn)" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending || !offre} className="btn btn-primary mt-5">
          {pending ? "Ouverture…" : "Ouvrir le dossier"}
          <ArrowRight size={16} />
        </button>
      </aside>
    </form>
  );
}

export function PayerCommissionForm({ commissionId }: { commissionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await payerCommission(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="commissionId" value={commissionId} />
      <button type="submit" disabled={pending} className="btn btn-primary !min-h-9 !px-3 text-[13px]">
        {pending ? "Paiement…" : "Marquer payée"}
      </button>
      {error ? <p className="mt-1 text-xs text-[#c93400]">{error}</p> : null}
    </form>
  );
}
