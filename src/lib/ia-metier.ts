import { prisma } from "./prisma";
import { executerOperationApi } from "./fournisseurs";

export const ACTIONS_INTERDITES_IA = [
  "signer",
  "payer",
  "valider",
  "quatre_yeux",
  "rembourser",
  "lever_fraude",
  "controler_document",
] as const;

export type SuggestionIa = {
  code: string;
  titre: string;
  detail: string;
};

export function modeIa(): "off" | "openai" {
  return process.env.OPENAI_API_KEY ? "openai" : "off";
}

export function iaPeut(action: string) {
  const normalise = action.trim().toLowerCase().replace(/\s+/g, "_");
  return !ACTIONS_INTERDITES_IA.some((a) => normalise === a || normalise.includes(a));
}

function filtrerSuggestions(items: SuggestionIa[]) {
  return items.filter((s) => iaPeut(s.code) && iaPeut(s.titre));
}

export async function analyserDossier(demandeId: string): Promise<{
  mode: "regles" | "openai";
  suggestions: SuggestionIa[];
  interdit: typeof ACTIONS_INTERDITES_IA;
}> {
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: {
      offre: { include: { pieces: true, service: true } },
      documents: true,
      checklist: true,
      espaceFinancier: true,
      alertesFraude: { where: { statut: { not: "levee" } } },
    },
  });
  if (!demande) {
    return { mode: "regles", suggestions: [], interdit: ACTIONS_INTERDITES_IA };
  }

  const suggestions: SuggestionIa[] = [];
  const manquantes = demande.offre.pieces.filter(
    (p) => p.obligatoire && !demande.documents.some((d) => d.idPieceRequise === p.id && d.statut !== "a_remplacer"),
  );
  if (manquantes.length) {
    suggestions.push({
      code: "pieces_manquantes",
      titre: "Pièces à déposer",
      detail: manquantes.map((p) => p.libelle).join(", "),
    });
  }
  const aRemplacer = demande.documents.filter((d) => d.statut === "a_remplacer");
  if (aRemplacer.length) {
    suggestions.push({
      code: "pieces_a_remplacer",
      titre: "Pièces à remplacer",
      detail: `${aRemplacer.length} document(s) refusé(s) au contrôle humain.`,
    });
  }
  if (demande.espaceFinancier && demande.espaceFinancier.statutFonds !== "fonds_recus") {
    suggestions.push({
      code: "fonds_en_attente",
      titre: "Fonds en attente",
      detail: "Le dossier n’est pas soldé. L’IA ne peut pas encaisser.",
    });
  }
  if (demande.alertesFraude.length) {
    suggestions.push({
      code: "controle_renforce",
      titre: "Contrôle renforcé ouvert",
      detail: "Alerte fraude à traiter par un humain. L’IA ne lève pas l’alerte.",
    });
  }
  const ocr = demande.documents.filter((d) => d.ocrStatut === "ok");
  if (ocr.length) {
    suggestions.push({
      code: "ocr_a_relire",
      titre: "Relire l’extraction OCR",
      detail: "Les champs extraits ne valident jamais une pièce tout seuls.",
    });
  }

  if (modeIa() === "openai") {
    const resultat = await executerOperationApi<{ suggestions: SuggestionIa[] }>({
      codeFournisseur: "ia",
      action: "analyser",
      cleIdempotence: `ia:${demandeId}:${demande.updatedAt.toISOString()}`,
      idDemande: demandeId,
      appeler: async () => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  "Tu aides un conseiller AVI. Tu ne signes pas, tu ne paies pas, tu ne valides pas à 4 yeux, tu ne rembourses pas. Réponds JSON {suggestions:[{code,titre,detail}]}.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  reference: demande.reference,
                  service: demande.offre.service.libelle,
                  statut: demande.statut,
                  piecesManquantes: manquantes.map((p) => p.libelle),
                  fonds: demande.espaceFinancier?.statutFonds,
                }),
              },
            ],
          }),
        });
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          error?: { message?: string };
        };
        if (!res.ok) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.error?.message ?? `OpenAI ${res.status}`,
            codeHttp: res.status,
          };
        }
        const brut = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: { suggestions?: SuggestionIa[] } = {};
        try {
          parsed = JSON.parse(brut.replace(/```json|```/g, "").trim()) as { suggestions?: SuggestionIa[] };
        } catch {
          parsed = {};
        }
        return {
          ok: true as const,
          data: { suggestions: filtrerSuggestions(parsed.suggestions ?? []) },
          codeHttp: res.status,
        };
      },
    });
    if (resultat.ok) {
      return {
        mode: "openai",
        suggestions: filtrerSuggestions([...suggestions, ...resultat.data.suggestions]),
        interdit: ACTIONS_INTERDITES_IA,
      };
    }
  }

  return { mode: "regles", suggestions: filtrerSuggestions(suggestions), interdit: ACTIONS_INTERDITES_IA };
}
