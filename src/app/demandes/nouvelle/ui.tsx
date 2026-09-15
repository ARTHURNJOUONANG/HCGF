"use client";

import { useMemo, useState } from "react";
import { ArrowRight, FileCheck, Home, Plane, Shield } from "lucide-react";
import { creerDemande } from "@/lib/actions";
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

const notes: Record<string, string> = {
  AVI: "Justificatif financier",
  ASSURANCE: "Couverture du séjour",
  HEBERGEMENT: "Attestation de logement",
  VOL: "Hold / Pay Later",
};

export function NouvelleDemandeForm({
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
        const result = await creerDemande(new FormData(event.currentTarget));
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <section className="open-step">
        <p className="kicker">1 · Service</p>
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
                    const first = offres.find((o) => o.service === s.code);
                    if (first) setPaysCode(first.pays);
                  }}
                />
                <span className="rail-ico" aria-hidden>
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>{s.libelle}</strong>
                  <small>{notes[s.code] ?? s.code}</small>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="open-step">
        <p className="kicker">2 · Destination</p>
        <input type="hidden" name="pays" value={paysCode} />
        <div className="pays-pick">
          {paysDispo.map((p) => (
            <label key={p.code} data-on={String(paysCode === p.code)}>
              <input
                type="radio"
                name="pays-ui"
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
            Cette combinaison n’est pas encore ouverte.
          </p>
        )}
        {error ? (
          <p className="mt-3 text-sm" style={{ color: "var(--warn)" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={!offre || pending} className="btn btn-primary mt-5">
          {pending ? "Ouverture…" : "Continuer"}
          <ArrowRight size={16} />
        </button>
      </aside>
    </form>
  );
}
