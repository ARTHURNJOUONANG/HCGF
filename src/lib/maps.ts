import { executerOperationApi } from "./fournisseurs";

export function modeMaps(): "demo" | "google" {
  return process.env.GOOGLE_MAPS_API_KEY ? "google" : "demo";
}

export async function dureeTransportMinutes(opts: {
  origine: string;
  destination: string;
  idDemande?: string;
  fallback: number;
}) {
  if (modeMaps() === "demo") {
    return { minutes: opts.fallback, mode: "demo" as const };
  }

  const cle = `maps:${opts.origine}:${opts.destination}`;
  const resultat = await executerOperationApi<{ minutes: number }>({
    codeFournisseur: "maps",
    action: "duree",
    cleIdempotence: cle,
    idDemande: opts.idDemande,
    appeler: async () => {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", opts.origine);
      url.searchParams.set("destinations", opts.destination);
      url.searchParams.set("mode", "transit");
      url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY ?? "");
      const res = await fetch(url);
      const json = (await res.json()) as {
        rows?: { elements?: { duration?: { value?: number }; status?: string }[] }[];
        status?: string;
        error_message?: string;
      };
      const secondes = json.rows?.[0]?.elements?.[0]?.duration?.value;
      if (!res.ok || json.status === "REQUEST_DENIED" || typeof secondes !== "number") {
        return {
          ok: false as const,
          indisponible: true,
          erreur: json.error_message ?? json.status ?? `Maps ${res.status}`,
          codeHttp: res.status,
        };
      }
      return {
        ok: true as const,
        data: { minutes: Math.round(secondes / 60) },
        codeHttp: res.status,
      };
    },
  });

  if (!resultat.ok) return { minutes: opts.fallback, mode: "demo" as const };
  return { minutes: resultat.data.minutes, mode: "google" as const };
}
