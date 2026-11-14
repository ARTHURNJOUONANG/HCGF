import { createHmac, timingSafeEqual } from "crypto";
import { origine } from "./origine";
import { executerOperationApi, type ResultatAppel } from "./fournisseurs";

export function modeEsign(): "demo" | "yousign" {
  return process.env.YOUSIGN_API_KEY ? "yousign" : "demo";
}

export async function creerProcedureSignature(opts: {
  demandeId: string;
  reference: string;
  documentNom: string;
  emailSignataire: string;
}) {
  const cle = `esign:${opts.demandeId}:${opts.reference}`;
  return executerOperationApi({
    codeFournisseur: "esign",
    action: "procedure",
    cleIdempotence: cle,
    idDemande: opts.demandeId,
    appeler: async (): Promise<ResultatAppel<{ idExterne: string; mode: "yousign" | "demo"; pending: boolean }>> => {
      if (modeEsign() === "yousign") {
        const base = await origine();
        const res = await fetch("https://api.yousign.app/v3/signature_requests", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `Dossier ${opts.reference}`,
            delivery_mode: "email",
            timezone: "Europe/Paris",
            signers: [
              {
                info: { email: opts.emailSignataire, locale: "fr" },
                signature_authentication_mode: "no_otp",
              },
            ],
            metadata: { demandeId: opts.demandeId, reference: opts.reference },
            webhook: `${base}/api/webhooks/yousign`,
          }),
        });
        const json = (await res.json()) as { id?: string; error?: { detail?: string } };
        if (!res.ok || !json.id) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.error?.detail ?? `Yousign ${res.status}`,
            codeHttp: res.status,
          };
        }
        return {
          ok: true as const,
          data: { idExterne: json.id, mode: "yousign" as const, pending: true },
          codeHttp: res.status,
          reponse: json.id,
        };
      }

      return {
        ok: true as const,
        data: {
          idExterne: `DEMO-SIGN-${opts.reference}`,
          mode: "demo" as const,
          pending: false,
        },
        codeHttp: 200,
        reponse: "demo",
      };
    },
  });
}

export function verifierWebhookYousign(payload: string, header: string) {
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET;
  if (!secret) return null;
  const calcul = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(calcul, "utf8");
  const b = Buffer.from(header, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(payload) as {
      event_name?: string;
      data?: { id?: string; metadata?: { demandeId?: string } };
    };
  } catch {
    return null;
  }
}
