import { createHmac, timingSafeEqual } from "crypto";
import { origine } from "./origine";
import { executerOperationApi } from "./fournisseurs";

export const MOYENS_INSTANTS = ["paypal", "orange_money", "mtn_money", "wero"] as const;
export type MoyenInstant = (typeof MOYENS_INSTANTS)[number];

export const LIBELLES_MOYEN: Record<string, string> = {
  paypal: "PayPal",
  orange_money: "Orange Money",
  mtn_money: "MTN Money",
  wero: "Wero",
  virement: "Virement bancaire",
};

export function estMoyenInstant(valeur: string): valeur is MoyenInstant {
  return (MOYENS_INSTANTS as readonly string[]).includes(valeur);
}

export function modeMoyen(code: MoyenInstant): "demo" | "live" {
  if (code === "paypal") {
    return process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "live" : "demo";
  }
  if (code === "orange_money") {
    return process.env.ORANGE_MONEY_API_KEY || process.env.ORANGE_MONEY_CLIENT_ID ? "live" : "demo";
  }
  if (code === "mtn_money") {
    return process.env.MTN_MOMO_SUBSCRIPTION_KEY ? "live" : "demo";
  }
  return process.env.WERO_API_KEY && process.env.WERO_API_URL ? "live" : "demo";
}

export function etatMoyensPaiement() {
  return {
    virement: "bureau" as const,
    paypal: modeMoyen("paypal"),
    orange_money: modeMoyen("orange_money"),
    mtn_money: modeMoyen("mtn_money"),
    wero: modeMoyen("wero"),
  };
}

export function clePaiementMoyen(moyen: string, demandeId: string, montant: number) {
  return `${moyen}:${demandeId}:${montant}`;
}

function paypalBase() {
  return process.env.PAYPAL_SANDBOX === "0" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function tokenPaypal() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal : clés manquantes");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? `PayPal token ${res.status}`);
  }
  return json.access_token;
}

export async function ouvrirPaiement(opts: {
  moyen: MoyenInstant;
  demandeId: string;
  reference: string;
  montant: number;
  email: string;
  telephone?: string;
  cleIdempotence: string;
}) {
  const cle = `${opts.moyen}:${opts.cleIdempotence}`;
  return executerOperationApi<{ id: string; url?: string; pending?: boolean }>({
    codeFournisseur: opts.moyen,
    action: "checkout",
    cleIdempotence: cle,
    idDemande: opts.demandeId,
    appeler: async () => {
      if (modeMoyen(opts.moyen) === "demo") {
        return {
          ok: true as const,
          data: { id: `DEMO-${opts.moyen}-${opts.reference}`, pending: false },
          codeHttp: 200,
          reponse: "demo",
        };
      }

      const base = await origine();
      const retour = `${base}/demandes/${opts.demandeId}?onglet=paiement`;

      if (opts.moyen === "paypal") {
        const token = await tokenPaypal();
        const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": opts.cleIdempotence,
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                reference_id: opts.demandeId,
                custom_id: opts.cleIdempotence,
                amount: { currency_code: "EUR", value: (opts.montant / 100).toFixed(2) },
                description: `Dossier ${opts.reference}`,
              },
            ],
            payment_source: {
              paypal: {
                experience_context: {
                  return_url: `${retour}&pay=ok`,
                  cancel_url: `${retour}&pay=annule`,
                },
              },
            },
          }),
        });
        const json = (await res.json()) as {
          id?: string;
          links?: { rel?: string; href?: string }[];
          message?: string;
        };
        const url = json.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
        if (!res.ok || !json.id || !url) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.message ?? `PayPal ${res.status}`,
            codeHttp: res.status,
          };
        }
        return { ok: true as const, data: { id: json.id, url, pending: true }, codeHttp: res.status };
      }

      if (opts.moyen === "orange_money") {
        const urlApi = process.env.ORANGE_MONEY_API_URL ?? "https://api.orange.com/orange-money-webpay/dev/v1/webpayment";
        const res = await fetch(urlApi, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.ORANGE_MONEY_API_KEY ?? process.env.ORANGE_MONEY_CLIENT_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merchant_key: process.env.ORANGE_MONEY_MERCHANT_KEY,
            currency: "EUR",
            order_id: opts.cleIdempotence,
            amount: opts.montant / 100,
            return_url: `${retour}&pay=ok`,
            cancel_url: `${retour}&pay=annule`,
            notif_url: `${base}/api/webhooks/orange-money`,
            lang: "fr",
            reference: opts.reference,
            subscriber_msisdn: opts.telephone,
          }),
        });
        const json = (await res.json()) as { payment_url?: string; pay_token?: string; message?: string };
        if (!res.ok || !json.pay_token) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.message ?? `Orange Money ${res.status}`,
            codeHttp: res.status,
          };
        }
        return {
          ok: true as const,
          data: { id: json.pay_token, url: json.payment_url, pending: true },
          codeHttp: res.status,
        };
      }

      if (opts.moyen === "mtn_money") {
        const env = process.env.MTN_MOMO_TARGET_ENV ?? "sandbox";
        const host =
          env === "production" ? "https://proxy.momoapi.mtn.com" : "https://sandbox.momodeveloper.mtn.com";
        const referenceId = crypto.randomUUID();
        const res = await fetch(`${host}/collection/v1_0/requesttopay`, {
          method: "POST",
          headers: {
            "X-Reference-Id": referenceId,
            "X-Target-Environment": env,
            "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? "",
            Authorization: `Bearer ${process.env.MTN_MOMO_API_KEY ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: (opts.montant / 100).toFixed(2),
            currency: "EUR",
            externalId: opts.cleIdempotence,
            payer: { partyIdType: "MSISDN", partyId: opts.telephone },
            payerMessage: `Dossier ${opts.reference}`,
            payeeNote: opts.demandeId,
          }),
        });
        if (!res.ok) {
          const texte = await res.text();
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: texte.slice(0, 200) || `MTN Money ${res.status}`,
            codeHttp: res.status,
          };
        }
        return { ok: true as const, data: { id: referenceId, pending: true }, codeHttp: res.status };
      }

      const res = await fetch(`${process.env.WERO_API_URL}/paiements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WERO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          montant: opts.montant,
          devise: "EUR",
          reference: opts.reference,
          demandeId: opts.demandeId,
          cleIdempotence: opts.cleIdempotence,
          email: opts.email,
          retour_ok: `${retour}&pay=ok`,
          retour_annule: `${retour}&pay=annule`,
          webhook: `${base}/api/webhooks/wero`,
        }),
      });
      const json = (await res.json()) as { id?: string; url?: string; error?: string };
      if (!res.ok || !json.id) {
        return {
          ok: false as const,
          indisponible: res.status >= 500,
          erreur: json.error ?? `Wero ${res.status}`,
          codeHttp: res.status,
        };
      }
      return { ok: true as const, data: { id: json.id, url: json.url, pending: true }, codeHttp: res.status };
    },
  });
}

export function verifierHmacPaiement(payload: string, header: string, secret?: string) {
  if (!secret || !header) return null;
  const calcul = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(calcul, "utf8");
  const b = Buffer.from(header, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(payload) as {
      demandeId?: string;
      cleIdempotence?: string;
      transaction?: string;
      montant?: number;
      status?: string;
    };
  } catch {
    return null;
  }
}
