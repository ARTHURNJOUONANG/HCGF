import { NextResponse } from "next/server";
import { confirmerPaiementExterne } from "@/lib/lot3";
import { LIBELLES_MOYEN, verifierHmacPaiement } from "@/lib/moyens-paiement";

function secretPour(moyen: string) {
  if (moyen === "paypal") return process.env.PAYPAL_WEBHOOK_SECRET;
  if (moyen === "orange_money") return process.env.ORANGE_MONEY_WEBHOOK_SECRET;
  if (moyen === "mtn_money") return process.env.MTN_MOMO_WEBHOOK_SECRET;
  if (moyen === "wero") return process.env.WERO_WEBHOOK_SECRET;
  return undefined;
}

export async function confirmerWebhookMoyen(moyen: string, request: Request) {
  const payload = await request.text();
  const signature =
    request.headers.get("paypal-transmission-sig") ??
    request.headers.get("x-orange-signature") ??
    request.headers.get("x-momo-signature") ??
    request.headers.get("x-wero-signature") ??
    request.headers.get("x-signature") ??
    "";
  const event = verifierHmacPaiement(payload, signature, secretPour(moyen));
  if (!event) {
    return NextResponse.json({ error: "signature" }, { status: 400 });
  }
  if (event.status && !["COMPLETED", "SUCCESS", "SUCCESSFUL", "ok"].includes(event.status)) {
    return NextResponse.json({ ok: true, ignore: event.status });
  }
  if (!event.demandeId || !event.cleIdempotence || !event.montant || !event.transaction) {
    return NextResponse.json({ error: "metadata" }, { status: 400 });
  }
  const resultat = await confirmerPaiementExterne({
    demandeId: event.demandeId,
    transaction: event.transaction,
    montant: event.montant,
    cleIdempotence: event.cleIdempotence,
    source: moyen,
    moyen: LIBELLES_MOYEN[moyen] ?? moyen,
  });
  if (resultat && "error" in resultat) {
    return NextResponse.json(resultat, { status: 422 });
  }
  return NextResponse.json({ ok: true, deja: resultat && "deja" in resultat ? resultat.deja : false });
}
