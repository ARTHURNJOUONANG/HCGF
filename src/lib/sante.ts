import { etatMoyensPaiement } from "./moyens-paiement";
import { modeOcr } from "./ocr";
import { modeEsign } from "./esign";
import { modeVol } from "./duffel";
import { modeAssureur } from "./assureur";
import { modeMaps } from "./maps";
import { modeIa } from "./ia-metier";

export function fournisseurBase(): "sqlite" | "postgres" {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres")) return "postgres";
  return "sqlite";
}

export function etatServices() {
  const detail = {
    base: fournisseurBase(),
    mail: process.env.RESEND_API_KEY ? "resend" : "journal",
    moyens: etatMoyensPaiement(),
    vol: modeVol(),
    assureur: modeAssureur(),
    esign: modeEsign(),
    ocr: modeOcr(),
    maps: modeMaps(),
    ia: modeIa(),
  };
  if (process.env.NODE_ENV === "production") {
    return { base: detail.base };
  }
  return detail;
}
