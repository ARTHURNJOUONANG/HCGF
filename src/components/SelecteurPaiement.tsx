"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PaiementMoyen, VirementForm } from "@/components/Lot3";
import { LogoPaiement } from "@/components/LogoPaiement";
import type { etatMoyensPaiement } from "@/lib/moyens-paiement";
import type { MoyenInstant } from "@/lib/moyens-paiement";

type MoyenId = MoyenInstant | "virement";

const OPTIONS: { id: MoyenId; label: string; hint: string }[] = [
  { id: "paypal", label: "PayPal", hint: "Redirection sécurisée vers PayPal" },
  { id: "orange_money", label: "Orange Money", hint: "Paiement sur le numéro mobile" },
  { id: "mtn_money", label: "MTN Money", hint: "Validation sur le téléphone MTN" },
  { id: "wero", label: "Wero", hint: "Paiement instantané européen" },
  { id: "virement", label: "Virement bancaire", hint: "Virement avec le libellé du dossier" },
];

export function SelecteurPaiement({
  demandeId,
  reference,
  iban,
  moyens,
}: {
  demandeId: string;
  reference: string;
  iban: string;
  moyens: ReturnType<typeof etatMoyensPaiement>;
}) {
  const [choix, setChoix] = useState<MoyenId | "">("");
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const actuel = OPTIONS.find((o) => o.id === choix);

  useEffect(() => {
    function fermer(event: MouseEvent) {
      if (!boite.current?.contains(event.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, []);

  return (
    <section className="card pay-box">
      <p className="kicker">Règlement</p>
      <h2 className="pay-box-title">Choisir un moyen</h2>
      <ul className="pay-brands" aria-label="Moyens acceptés">
        {OPTIONS.map((option) => (
          <li key={option.id} title={option.label}>
            <LogoPaiement id={option.id} />
          </li>
        ))}
      </ul>

      <div className="pay-select-wrap" ref={boite}>
        <button
          type="button"
          className="pay-select"
          aria-expanded={ouvert}
          aria-haspopup="listbox"
          onClick={() => setOuvert((v) => !v)}
        >
          {actuel ? (
            <span className="pay-select-current">
              <LogoPaiement id={actuel.id} />
              <span>
                <strong>{actuel.label}</strong>
                <em>{actuel.hint}</em>
              </span>
            </span>
          ) : (
            <span className="pay-select-placeholder">Sélectionner un agrégateur</span>
          )}
          <ChevronDown size={18} />
        </button>
        {ouvert ? (
          <ul className="pay-menu" role="listbox">
            {OPTIONS.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`pay-option${choix === option.id ? " is-on" : ""}`}
                  onClick={() => {
                    setChoix(option.id);
                    setOuvert(false);
                  }}
                >
                  <LogoPaiement id={option.id} />
                  <span>
                    <strong>{option.label}</strong>
                    <em>{option.hint}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {choix && actuel ? (
        <div className="pay-chosen">
          {choix === "virement" ? (
            <>
              <div className="iban-box">
                {iban ? (
                  <p>
                    IBAN <strong>{iban}</strong>
                  </p>
                ) : (
                  <p>L’IBAN de l’entreprise vous sera communiqué par l’équipe.</p>
                )}
                <p>
                  Libellé <strong>{reference}</strong>
                </p>
              </div>
              <VirementForm demandeId={demandeId} />
            </>
          ) : (
            <PaiementMoyen demandeId={demandeId} moyen={choix} mode={moyens[choix]} />
          )}
        </div>
      ) : null}
    </section>
  );
}
