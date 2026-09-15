"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Check, CreditCard, Landmark, Undo2 } from "lucide-react";
import {
  demanderRemboursement,
  declarerVirement,
  payerParMoyen,
  rapprocherVirement,
  traiterRemboursement,
} from "@/lib/lot3";
import type { MoyenInstant } from "@/lib/moyens-paiement";

function FormEtat({
  children,
  action,
  valider = "Valider",
}: {
  children: React.ReactNode;
  action: (data: FormData) => Promise<{ error?: string; ok?: boolean; url?: string; pending?: boolean }>;
  valider?: string;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setEtat("");
        const form = event.currentTarget;
        const result = await action(new FormData(form));
        if (result.url) {
          window.location.href = result.url;
          return;
        }
        setPending(false);
        setEtat(result.error ?? (result.pending ? "Validez le paiement sur votre téléphone." : "Enregistré"));
        if (!result.error) {
          form.reset();
          router.refresh();
        }
      }}
    >
      {children}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "…" : valider}
        </button>
        {etat ? <span className="text-sm muted">{etat}</span> : null}
      </div>
    </form>
  );
}

const TEXTES_MOYEN: Record<MoyenInstant, { aide: string; bouton: string; mobile?: boolean }> = {
  paypal: {
    aide: "Vous serez renvoyé vers PayPal. Aucun identifiant n’est saisi sur HCGF.",
    bouton: "Payer avec PayPal",
  },
  orange_money: {
    aide: "Le paiement part vers le numéro Orange Money indiqué.",
    bouton: "Payer avec Orange Money",
    mobile: true,
  },
  mtn_money: {
    aide: "Validez ensuite la demande sur votre téléphone MTN.",
    bouton: "Payer avec MTN Money",
    mobile: true,
  },
  wero: {
    aide: "Paiement instantané européen. Vous serez renvoyé vers votre banque Wero.",
    bouton: "Payer avec Wero",
  },
};

export function PaiementMoyen({
  demandeId,
  moyen,
  mode = "demo",
}: {
  demandeId: string;
  moyen: MoyenInstant;
  mode?: "demo" | "live";
}) {
  const texte = TEXTES_MOYEN[moyen];
  return (
    <FormEtat action={payerParMoyen} valider={texte.bouton}>
      <input type="hidden" name="demandeId" value={demandeId} />
      <input type="hidden" name="moyen" value={moyen} />
      <p className="muted mt-2 text-sm">
        {texte.aide}
      </p>
      {texte.mobile ? (
        <label className="field">
          Numéro mobile money
          <input className="input" name="telephone" inputMode="tel" placeholder="Numéro du compte" required />
        </label>
      ) : null}
    </FormEtat>
  );
}

export function VirementForm({ demandeId }: { demandeId: string }) {
  return (
    <FormEtat action={declarerVirement} valider="Déclarer">
      <input type="hidden" name="demandeId" value={demandeId} />
      <label className="field">
        Référence du virement
        <input className="input" name="reference" placeholder="Référence du virement" required />
      </label>
    </FormEtat>
  );
}

export function RemboursementForm({ demandeId }: { demandeId: string }) {
  return (
    <FormEtat action={demanderRemboursement} valider="Demander">
      <input type="hidden" name="demandeId" value={demandeId} />
      <label className="field">
        Motif
        <textarea className="input !min-h-24 py-3" name="motif" required />
      </label>
      <label className="field">
        IBAN de remboursement
        <input className="input" name="iban" placeholder="FR76 …" required />
      </label>
    </FormEtat>
  );
}

export function RapprocherForm({ operationId }: { operationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        await rapprocherVirement(new FormData(event.currentTarget));
        setPending(false);
        router.refresh();
      }}
    >
      <input type="hidden" name="operationId" value={operationId} />
      <button type="submit" disabled={pending} className="icon-btn" title="Rapprocher" aria-label="Rapprocher">
        <Landmark size={18} />
      </button>
    </form>
  );
}

export function TraiterRemboursement({
  remboursementId,
  statut,
}: {
  remboursementId: string;
  statut: string;
}) {
  const router = useRouter();

  async function agir(action: string) {
    const data = new FormData();
    data.set("remboursementId", remboursementId);
    data.set("action", action);
    await traiterRemboursement(data);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      {statut === "recue" ? (
        <button type="button" className="icon-btn" title="À vérifier" onClick={() => agir("verifier")}>
          <CreditCard size={16} />
        </button>
      ) : null}
      {statut === "a_verifier" || statut === "validee" ? (
        <button type="button" className="icon-btn" title="Valider" onClick={() => agir("valider")}>
          <Check size={16} />
        </button>
      ) : null}
      {statut === "validee" ? (
        <button type="button" className="icon-btn" title="Rembourser" onClick={() => agir("payer")}>
          <Undo2 size={16} />
        </button>
      ) : null}
      {statut !== "remboursee" && statut !== "refusee" ? (
        <button type="button" className="icon-btn" title="Refuser" onClick={() => agir("refuser")}>
          <Ban size={16} />
        </button>
      ) : null}
    </div>
  );
}
