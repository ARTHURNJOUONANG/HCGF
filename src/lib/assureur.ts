import { executerOperationApi } from "./fournisseurs";

export function modeAssureur(): "demo" | "api" {
  return process.env.ASSUREUR_API_KEY && process.env.ASSUREUR_API_URL ? "api" : "demo";
}

export async function souscrireChezAssureur(opts: {
  demandeId: string;
  reference: string;
  codeFormule: string;
  dateDebut: string;
  dateFin: string;
}) {
  const cle = `assureur:police:${opts.demandeId}:${opts.codeFormule}`;
  return executerOperationApi({
    codeFournisseur: "assureur",
    action: "souscrire",
    cleIdempotence: cle,
    idDemande: opts.demandeId,
    appeler: async () => {
      if (modeAssureur() === "api") {
        const res = await fetch(`${process.env.ASSUREUR_API_URL}/polices`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.ASSUREUR_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference: opts.reference,
            formule: opts.codeFormule,
            debut: opts.dateDebut,
            fin: opts.dateFin,
          }),
        });
        const json = (await res.json()) as { id?: string; numero?: string; error?: string };
        if (!res.ok || !(json.id || json.numero)) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.error ?? `Assureur ${res.status}`,
            codeHttp: res.status,
          };
        }
        return {
          ok: true as const,
          data: { idExterne: json.numero ?? json.id ?? "" },
          codeHttp: res.status,
        };
      }

      return {
        ok: true as const,
        data: { idExterne: "" },
        codeHttp: 200,
        reponse: "demo",
      };
    },
  });
}
