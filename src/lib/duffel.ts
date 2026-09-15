import type { OffreVol } from "./catalogues";
import { executerOperationApi } from "./fournisseurs";

export function modeVol(): "demo" | "duffel" {
  return process.env.DUFFEL_API_KEY ? "duffel" : "demo";
}

function headersDuffel() {
  return {
    Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
    "Duffel-Version": process.env.DUFFEL_VERSION ?? "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function dateDepartDefaut(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export async function rechercherOffresVol(opts: {
  origin: string;
  destination: string;
  date?: string;
  idDemande?: string;
}): Promise<OffreVol[]> {
  if (modeVol() === "demo") {
    return [];
  }

  const origin = opts.origin.slice(0, 3).toUpperCase() || "CDG";
  const destination = opts.destination.slice(0, 3).toUpperCase() || "FRA";
  const cle = `duffel:search:${origin}:${destination}:${dateDepartDefaut(opts.date)}`;
  const resultat = await executerOperationApi<{ offres: OffreVol[] }>({
    codeFournisseur: "duffel",
    action: "search",
    cleIdempotence: cle,
    idDemande: opts.idDemande,
    appeler: async () => {
      const res = await fetch("https://api.duffel.com/air/offer_requests", {
        method: "POST",
        headers: headersDuffel(),
        body: JSON.stringify({
          data: {
            slices: [
              {
                origin,
                destination,
                departure_date: dateDepartDefaut(opts.date),
              },
            ],
            passengers: [{ type: "adult" }],
            cabin_class: "economy",
          },
        }),
      });
      const json = (await res.json()) as {
        data?: {
          offers?: {
            id: string;
            total_amount: string;
            owner?: { name?: string };
            payment_requirements?: { requires_instant_payment?: boolean };
            slices?: {
              origin?: { iata_code?: string; name?: string };
              destination?: { iata_code?: string; name?: string };
              segments?: {
                departing_at?: string;
                arriving_at?: string;
                marketing_carrier?: { name?: string };
              }[];
            }[];
          }[];
        };
        errors?: { message?: string }[];
      };
      if (!res.ok) {
        return {
          ok: false as const,
          indisponible: res.status >= 500,
          erreur: json.errors?.[0]?.message ?? `Duffel ${res.status}`,
          codeHttp: res.status,
        };
      }
      const offres: OffreVol[] = (json.data?.offers ?? []).slice(0, 8).map((o) => {
        const slice = o.slices?.[0];
        const seg = slice?.segments?.[0];
        const instant = Boolean(o.payment_requirements?.requires_instant_payment);
        const heure = (iso?: string) => (iso ? iso.slice(11, 16) : "");
        return {
          code: o.id,
          from: slice?.origin?.iata_code ?? origin,
          to: slice?.destination?.iata_code ?? destination,
          fromNom: slice?.origin?.name ?? origin,
          toNom: slice?.destination?.name ?? destination,
          airline: o.owner?.name ?? seg?.marketing_carrier?.name ?? "Compagnie",
          depart: heure(seg?.departing_at),
          arrivee: heure(seg?.arriving_at),
          prix: Math.round(Number(o.total_amount) * 100) || 0,
          hold: !instant,
          garantieHeures: instant ? 0 : 48,
        };
      });
      return { ok: true as const, data: { offres }, codeHttp: res.status, reponse: `${offres.length} offres` };
    },
  });

  if (!resultat.ok) return [];
  return resultat.data.offres;
}

export async function creerHoldDuffel(opts: {
  demandeId: string;
  offre: OffreVol;
}) {
  const cle = `duffel:hold:${opts.demandeId}:${opts.offre.code}`;
  return executerOperationApi({
    codeFournisseur: "duffel",
    action: "hold",
    cleIdempotence: cle,
    idDemande: opts.demandeId,
    appeler: async () => {
      if (opts.offre.hold === false) {
        return { ok: false as const, erreur: "Hold interdit : paiement immédiat exigé." };
      }
      if (modeVol() === "duffel") {
        const res = await fetch("https://api.duffel.com/air/orders", {
          method: "POST",
          headers: headersDuffel(),
          body: JSON.stringify({
            data: {
              selected_offers: [opts.offre.code],
              type: "hold",
              passengers: [],
            },
          }),
        });
        const json = (await res.json()) as {
          data?: { id?: string; booking_reference?: string };
          errors?: { message?: string }[];
        };
        if (!res.ok || !json.data?.id) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.errors?.[0]?.message ?? `Duffel hold ${res.status}`,
            codeHttp: res.status,
          };
        }
        return {
          ok: true as const,
          data: {
            providerOrderId: json.data.id,
            bookingReference: json.data.booking_reference ?? json.data.id,
            provider: "DUFFEL",
          },
          codeHttp: res.status,
        };
      }

      const pnr = `A${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      return {
        ok: true as const,
        data: {
          providerOrderId: `ORD-${Date.now()}`,
          bookingReference: pnr,
          provider: "AVI-AIR",
        },
        codeHttp: 200,
        reponse: "demo",
      };
    },
  });
}
