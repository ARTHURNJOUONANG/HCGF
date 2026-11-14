import { executerOperationApi } from "./fournisseurs";

export function modeAssureur(): "demo" | "api" {
  return process.env.ASSUREUR_API_KEY?.trim() && process.env.ASSUREUR_API_URL?.trim() ? "api" : "demo";
}

export type DonneesSouscriptionAssurance = {
  demandeId: string;
  reference: string;
  codeFormule: string;
  dateDebut: string;
  dateFin: string;
  assure?: {
    nom?: string;
    prenom?: string;
    email?: string;
    dateNaissance?: string;
    telephone?: string;
    nationalite?: string;
  };
  destinationPays?: string;
};

export async function souscrireChezAssureur(opts: DonneesSouscriptionAssurance) {
  const cle = `assureur:police:${opts.demandeId}:${opts.codeFormule}`;
  return executerOperationApi<{ idExterne: string }>({
    codeFournisseur: "assureur",
    action: "souscrire",
    cleIdempotence: cle,
    idDemande: opts.demandeId,
    appeler: async () => {
      if (modeAssureur() === "api") {
        const res = await fetch(`${process.env.ASSUREUR_API_URL!.replace(/\/$/, "")}/polices`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.ASSUREUR_API_KEY!.trim()}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            reference: opts.reference,
            formule: opts.codeFormule,
            debut: opts.dateDebut,
            fin: opts.dateFin,
            destination: opts.destinationPays ?? "",
            assure: opts.assure ?? {},
          }),
        });
        const json = (await res.json()) as { id?: string; numero?: string; error?: string; message?: string };
        if (!res.ok || !(json.id || json.numero)) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.error ?? json.message ?? `Assureur ${res.status}`,
            codeHttp: res.status,
          };
        }
        return {
          ok: true as const,
          data: { idExterne: String(json.numero ?? json.id) },
          codeHttp: res.status,
        };
      }

      // Démo : numéro de police local stable pour le dossier
      const idExterne = `POL-DEMO-${opts.reference.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}`;
      return {
        ok: true as const,
        data: { idExterne },
        codeHttp: 200,
        reponse: "demo",
      };
    },
  });
}
