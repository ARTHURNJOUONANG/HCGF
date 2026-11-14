import { createHash } from "crypto";
import { prisma } from "./prisma";
import { executerOperationApi, type ResultatAppel } from "./fournisseurs";

export function modeOcr(): "demo" | "api" {
  return process.env.OCR_API_KEY ? "api" : "demo";
}

export function hashBuffer(buffer: Buffer | Uint8Array | string) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function extraireOcr(opts: {
  documentId: string;
  idDemande: string;
  nom: string;
  format: string;
  buffer: Buffer;
}) {
  const cle = `ocr:${opts.documentId}`;
  const resultat = await executerOperationApi({
    codeFournisseur: "ocr",
    action: "extraire",
    cleIdempotence: cle,
    idDemande: opts.idDemande,
    appeler: async (): Promise<ResultatAppel<{ texte: string; source: "api" | "demo" }>> => {
      if (modeOcr() === "api") {
        const url = process.env.OCR_API_URL;
        if (!url) {
          return { ok: false, indisponible: true, erreur: "OCR_API_URL manquante" };
        }
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OCR_API_KEY}`,
            "Content-Type": opts.format || "application/octet-stream",
          },
          body: new Uint8Array(opts.buffer),
        });
        const texte = await res.text();
        if (!res.ok) {
          return {
            ok: false,
            indisponible: res.status >= 500,
            erreur: `OCR ${res.status}`,
            codeHttp: res.status,
            reponse: texte,
          };
        }
        return {
          ok: true,
          data: { texte: texte.slice(0, 8000), source: "api" as const },
          codeHttp: res.status,
          reponse: "ok",
        };
      }

      return {
        ok: true,
        data: {
          texte: "",
          source: "demo" as const,
        },
        codeHttp: 200,
        reponse: "demo",
      };
    },
  });

  if (!resultat.ok) {
    await prisma.document.update({
      where: { id: opts.documentId },
      data: { ocrStatut: "echec", ocrTexte: resultat.error },
    });
    return resultat;
  }

  await prisma.document.update({
    where: { id: opts.documentId },
    data: {
      ocrStatut: "ok",
      ocrTexte: resultat.data.texte,
      ocrJson: JSON.stringify({ source: resultat.data.source, autoApprouve: false }),
    },
  });
  return resultat;
}
