"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  choisirLogement,
  emettreAttestationAssurance,
  emettreJustificatifVol,
  inscrireListeAttente,
  lancerMatching,
  ouvrirAssuranceDepuisAvi,
  poserHold,
  souscrirePolice,
} from "@/lib/services-metier";

function ActionForm({
  action,
  children,
  label = "Valider",
  compact = false,
}: {
  action: (data: FormData) => Promise<{ error?: string; ok?: boolean }>;
  children: React.ReactNode;
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className={compact ? "offer-action" : "mt-4 space-y-3"}
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setEtat("");
        const form = event.currentTarget;
        const result = await action(new FormData(form));
        setPending(false);
        if (result?.error) setEtat(result.error);
        else {
          setEtat("Enregistré");
          router.refresh();
        }
      }}
    >
      {children}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={compact ? "btn btn-ghost !min-h-10" : "btn btn-primary"}>
          {pending ? "…" : label}
        </button>
        {etat ? <span className="text-sm muted">{etat}</span> : null}
      </div>
    </form>
  );
}

export function VenteCroiseeAvi({ demandeId }: { demandeId: string }) {
  return (
    <form action={ouvrirAssuranceDepuisAvi}>
      <input type="hidden" name="idOrigine" value={demandeId} />
      <button type="submit" className="btn btn-primary">
        Préremplir une assurance
      </button>
    </form>
  );
}

export function SouscrireFormule({ demandeId, formule }: { demandeId: string; formule: string }) {
  return (
    <ActionForm action={souscrirePolice} label="Choisir" compact>
      <input type="hidden" name="demandeId" value={demandeId} />
      <input type="hidden" name="formule" value={formule} />
    </ActionForm>
  );
}

export function AttestationAssuranceBtn({ demandeId }: { demandeId: string }) {
  return (
    <ActionForm action={emettreAttestationAssurance} label="Émettre l’attestation">
      <input type="hidden" name="demandeId" value={demandeId} />
    </ActionForm>
  );
}

export function HoldBtn({ demandeId, offreCode }: { demandeId: string; offreCode: string }) {
  return (
    <ActionForm action={poserHold} label="Poser un Hold" compact>
      <input type="hidden" name="demandeId" value={demandeId} />
      <input type="hidden" name="offreCode" value={offreCode} />
    </ActionForm>
  );
}

export function JustificatifVolBtn({ reservationId }: { reservationId: string }) {
  return (
    <ActionForm action={emettreJustificatifVol} label="Justificatif « billet non émis »">
      <input type="hidden" name="reservationId" value={reservationId} />
    </ActionForm>
  );
}

export function MatchingBtn({ demandeId }: { demandeId: string }) {
  return (
    <ActionForm action={lancerMatching} label="Calculer les trajets" compact>
      <input type="hidden" name="demandeId" value={demandeId} />
    </ActionForm>
  );
}

export function ChoisirLogementBtn({ demandeId, idLogement }: { demandeId: string; idLogement: string }) {
  return (
    <ActionForm action={choisirLogement} label="Choisir" compact>
      <input type="hidden" name="demandeId" value={demandeId} />
      <input type="hidden" name="idLogement" value={idLogement} />
    </ActionForm>
  );
}

export function ListeAttenteBtn({ demandeId }: { demandeId: string }) {
  return (
    <ActionForm action={inscrireListeAttente} label="S’inscrire en liste d’attente">
      <input type="hidden" name="demandeId" value={demandeId} />
    </ActionForm>
  );
}
