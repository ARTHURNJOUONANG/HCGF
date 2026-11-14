import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { etatMoyen, paiementDemoAutorise, verifierHmacPaiement } from "@/lib/moyens-paiement";

afterEach(() => vi.unstubAllEnvs());

describe("mode démo des paiements", () => {
  it("est autorisé hors production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(paiementDemoAutorise()).toBe(true);
    expect(etatMoyen("paypal")).toBe("demo");
  });
  it("est interdit en production sans PAIEMENT_DEMO=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAIEMENT_DEMO", "");
    expect(paiementDemoAutorise()).toBe(false);
    expect(etatMoyen("paypal")).toBe("indisponible");
    expect(etatMoyen("orange_money")).toBe("indisponible");
  });
  it("peut être activé explicitement pour une preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAIEMENT_DEMO", "1");
    expect(etatMoyen("mtn_money")).toBe("demo");
  });
  it("reste live quand les clés sont présentes", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYPAL_CLIENT_ID", "id");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret");
    expect(etatMoyen("paypal")).toBe("live");
  });
});

describe("verifierHmacPaiement", () => {
  const secret = "webhook-secret";
  const payload = JSON.stringify({ demandeId: "d1", montant: 9900, status: "COMPLETED" });
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  it("accepte une signature valide", () => {
    expect(verifierHmacPaiement(payload, signature, secret)?.montant).toBe(9900);
  });
  it("refuse une signature fausse, absente ou un secret non configuré", () => {
    expect(verifierHmacPaiement(payload, "0".repeat(64), secret)).toBeNull();
    expect(verifierHmacPaiement(payload, "", secret)).toBeNull();
    expect(verifierHmacPaiement(payload, signature, undefined)).toBeNull();
  });
  it("refuse un contenu modifié après signature", () => {
    expect(verifierHmacPaiement(payload.replace("9900", "1"), signature, secret)).toBeNull();
  });
});
