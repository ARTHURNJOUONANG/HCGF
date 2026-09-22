import type { OffreVol } from "./catalogues";
import { chercherVols } from "./catalogues";
import { codeIata } from "./aeroports";
import { executerOperationApi } from "./fournisseurs";

export { codeIata } from "./aeroports";

export function modeVol(): "demo" | "duffel" {
  return process.env.DUFFEL_API_KEY?.trim() ? "duffel" : "demo";
}

function headersDuffel() {
  return {
    Authorization: `Bearer ${process.env.DUFFEL_API_KEY!.trim()}`,
    "Duffel-Version": process.env.DUFFEL_VERSION ?? "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip",
  };
}

function dateDepartDefaut(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function heureIso(iso?: string) {
  return iso ? iso.slice(11, 16) : "";
}

export type PassagerHold = {
  prenom: string;
  nom: string;
  dateNaissance: string;
  email: string;
  telephone?: string;
  sexe?: string;
};

type DuffelOfferRequest = {
  data?: {
    passengers?: { id: string }[];
    offers?: {
      id: string;
      total_amount: string;
      total_currency?: string;
      owner?: { name?: string };
      payment_requirements?: {
        requires_instant_payment?: boolean;
        payment_required_by?: string | null;
      };
      slices?: {
        origin?: { iata_code?: string; name?: string; city_name?: string };
        destination?: { iata_code?: string; name?: string; city_name?: string };
        segments?: {
          departing_at?: string;
          arriving_at?: string;
          marketing_carrier?: { name?: string; iata_code?: string };
          operating_carrier?: { name?: string };
        }[];
      }[];
    }[];
  };
  errors?: { message?: string; title?: string }[];
};

function mapperOffresDuffel(
  json: DuffelOfferRequest,
  origin: string,
  destination: string,
): OffreVol[] {
  const passengerIds = (json.data?.passengers ?? []).map((p) => p.id);
  return (json.data?.offers ?? []).slice(0, 12).map((o) => {
    const slice = o.slices?.[0];
    const seg = slice?.segments?.[0];
    const sliceRetour = o.slices?.[1];
    const segRetour = sliceRetour?.segments?.[0];
    const instant = Boolean(o.payment_requirements?.requires_instant_payment);
    const from = slice?.origin?.iata_code ?? origin;
    const to = slice?.destination?.iata_code ?? destination;
    return {
      code: o.id,
      from,
      to,
      fromNom: slice?.origin?.city_name || slice?.origin?.name || from,
      toNom: slice?.destination?.city_name || slice?.destination?.name || to,
      airline: o.owner?.name ?? seg?.marketing_carrier?.name ?? "Compagnie",
      depart: heureIso(seg?.departing_at),
      arrivee: heureIso(seg?.arriving_at),
      retourDepart: heureIso(segRetour?.departing_at) || undefined,
      retourArrivee: heureIso(segRetour?.arriving_at) || undefined,
      prix: Math.round(Number(o.total_amount) * 100) || 0,
      hold: !instant,
      garantieHeures: instant ? 0 : 48,
      passengerIds,
      currency: o.total_currency ?? "EUR",
      paymentRequiredBy: o.payment_requirements?.payment_required_by ?? undefined,
    };
  });
}

export async function rechercherOffresVol(opts: {
  origin: string;
  destination: string;
  date?: string;
  dateRetour?: string;
  idDemande?: string;
}): Promise<OffreVol[]> {
  const origin = codeIata(opts.origin, "CDG");
  const destination = codeIata(opts.destination, "");
  if (!destination || destination.length !== 3) {
    return chercherVols(opts.origin || "CDG", opts.destination || "");
  }

  if (modeVol() === "demo") {
    const locaux = chercherVols(origin, destination);
    return locaux.length > 0 ? locaux : OFFRES_DEMO_FILTREES(origin, destination);
  }

  const dateAller = dateDepartDefaut(opts.date);
  const slices: { origin: string; destination: string; departure_date: string }[] = [
    { origin, destination, departure_date: dateAller },
  ];
  if (opts.dateRetour && /^\d{4}-\d{2}-\d{2}$/.test(opts.dateRetour)) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: opts.dateRetour,
    });
  }

  // Fenêtre 5 min : les offres Duffel expirent vite, on ne fige pas pour toujours.
  const fenetre = Math.floor(Date.now() / (5 * 60 * 1000));
  const cle = `duffel:search:${origin}:${destination}:${dateAller}:${opts.dateRetour ?? "ow"}:${fenetre}`;

  const resultat = await executerOperationApi<{ offres: OffreVol[] }>({
    codeFournisseur: "duffel",
    action: "search",
    cleIdempotence: cle,
    idDemande: opts.idDemande,
    appeler: async () => {
      const res = await fetch("https://api.duffel.com/air/offer_requests?return_offers=true", {
        method: "POST",
        headers: headersDuffel(),
        body: JSON.stringify({
          data: {
            slices,
            passengers: [{ type: "adult" }],
            cabin_class: "economy",
          },
        }),
      });
      const json = (await res.json()) as DuffelOfferRequest;
      if (!res.ok) {
        return {
          ok: false as const,
          indisponible: res.status >= 500,
          erreur: json.errors?.[0]?.message ?? json.errors?.[0]?.title ?? `Duffel ${res.status}`,
          codeHttp: res.status,
        };
      }
      const offres = mapperOffresDuffel(json, origin, destination);
      return {
        ok: true as const,
        data: { offres },
        codeHttp: res.status,
        reponse: `${offres.length} offres`,
      };
    },
  });

  if (!resultat.ok || resultat.data.offres.length === 0) {
    const locaux = chercherVols(origin, destination);
    return locaux.length > 0 ? locaux : OFFRES_DEMO_FILTREES(origin, destination);
  }
  return resultat.data.offres;
}

function OFFRES_DEMO_FILTREES(origin: string, destination: string): OffreVol[] {
  return chercherVols(origin, destination);
}

export async function creerHoldDuffel(opts: {
  demandeId: string;
  offre: OffreVol;
  passager: PassagerHold;
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

      const offreLive = opts.offre.code.startsWith("off_");
      if (modeVol() === "duffel" && offreLive) {
        let passengerId = opts.offre.passengerIds?.[0];
        if (!passengerId) {
          const getOffer = await fetch(`https://api.duffel.com/air/offers/${opts.offre.code}`, {
            headers: headersDuffel(),
          });
          const offerJson = (await getOffer.json()) as {
            data?: { passengers?: { id: string }[] };
            errors?: { message?: string }[];
          };
          passengerId = offerJson.data?.passengers?.[0]?.id;
          if (!passengerId) {
            return {
              ok: false as const,
              erreur: offerJson.errors?.[0]?.message ?? "Passager Duffel introuvable sur l’offre.",
              codeHttp: getOffer.status,
            };
          }
        }

        const bornOn =
          opts.passager.dateNaissance && /^\d{4}-\d{2}-\d{2}$/.test(opts.passager.dateNaissance)
            ? opts.passager.dateNaissance
            : "1998-01-15";
        const gender =
          opts.passager.sexe?.toLowerCase().startsWith("f") || opts.passager.sexe === "2" ? "f" : "m";
        const phone = (opts.passager.telephone || "").replace(/\s/g, "") || "+33100000000";
        const email = opts.passager.email || "voyageur@hcgf.invalid";

        const res = await fetch("https://api.duffel.com/air/orders", {
          method: "POST",
          headers: headersDuffel(),
          body: JSON.stringify({
            data: {
              type: "hold",
              selected_offers: [opts.offre.code],
              passengers: [
                {
                  id: passengerId,
                  given_name: (opts.passager.prenom || "Voyageur").slice(0, 40),
                  family_name: (opts.passager.nom || "HCGF").slice(0, 40),
                  born_on: bornOn,
                  gender,
                  title: gender === "f" ? "ms" : "mr",
                  email,
                  phone_number: phone.startsWith("+") ? phone : `+33${phone.replace(/^0/, "")}`,
                },
              ],
            },
          }),
        });
        const json = (await res.json()) as {
          data?: {
            id?: string;
            booking_reference?: string;
            payment_status?: { payment_required_by?: string | null };
          };
          errors?: { message?: string; title?: string }[];
        };
        if (!res.ok || !json.data?.id) {
          return {
            ok: false as const,
            indisponible: res.status >= 500,
            erreur: json.errors?.[0]?.message ?? json.errors?.[0]?.title ?? `Duffel hold ${res.status}`,
            codeHttp: res.status,
          };
        }
        return {
          ok: true as const,
          data: {
            providerOrderId: json.data.id,
            bookingReference: json.data.booking_reference ?? json.data.id,
            provider: "DUFFEL",
            paymentRequiredBy: json.data.payment_status?.payment_required_by ?? null,
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
          paymentRequiredBy: null as string | null,
        },
        codeHttp: 200,
        reponse: "demo",
      };
    },
  });
}

/** Paye un Hold Duffel (balance test = illimitée) → billet émis côté compagnie. */
export async function payerHoldDuffel(opts: {
  demandeId?: string | null;
  providerOrderId: string;
  montantCentimes: number;
  currency?: string;
}) {
  const cle = `duffel:pay:${opts.providerOrderId}`;
  return executerOperationApi<{ paymentId: string; status: string }>({
    codeFournisseur: "duffel",
    action: "pay",
    cleIdempotence: cle,
    idDemande: opts.demandeId,
    appeler: async () => {
      if (modeVol() !== "duffel" || !opts.providerOrderId.startsWith("ord_")) {
        return {
          ok: true as const,
          data: { paymentId: `pay-demo-${Date.now()}`, status: "succeeded" },
          codeHttp: 200,
          reponse: "demo",
        };
      }

      // Prix à jour (obligatoire avant paiement)
      const getRes = await fetch(`https://api.duffel.com/air/orders/${opts.providerOrderId}`, {
        headers: headersDuffel(),
      });
      const getJson = (await getRes.json()) as {
        data?: {
          id?: string;
          total_amount?: string;
          total_currency?: string;
          payment_status?: { awaiting_payment?: boolean; payment_required_by?: string | null };
        };
        errors?: { message?: string; title?: string }[];
      };
      if (!getRes.ok || !getJson.data?.total_amount) {
        return {
          ok: false as const,
          erreur: getJson.errors?.[0]?.message ?? getJson.errors?.[0]?.title ?? `Lecture ordre ${getRes.status}`,
          codeHttp: getRes.status,
        };
      }

      const amount = getJson.data.total_amount;
      const currency = getJson.data.total_currency ?? opts.currency ?? "EUR";

      const res = await fetch("https://api.duffel.com/air/payments", {
        method: "POST",
        headers: headersDuffel(),
        body: JSON.stringify({
          data: {
            order_id: opts.providerOrderId,
            payment: {
              type: "balance",
              amount,
              currency,
            },
          },
        }),
      });
      const json = (await res.json()) as {
        data?: { id?: string; status?: string };
        errors?: { message?: string; title?: string; code?: string }[];
      };
      if (!res.ok || !json.data?.id) {
        return {
          ok: false as const,
          indisponible: res.status >= 500,
          erreur: json.errors?.[0]?.message ?? json.errors?.[0]?.title ?? `Paiement Duffel ${res.status}`,
          codeHttp: res.status,
        };
      }
      if (json.data.status === "failed") {
        return { ok: false as const, erreur: "Paiement Duffel refusé.", codeHttp: res.status };
      }
      return {
        ok: true as const,
        data: { paymentId: json.data.id, status: json.data.status ?? "succeeded" },
        codeHttp: res.status,
      };
    },
  });
}
