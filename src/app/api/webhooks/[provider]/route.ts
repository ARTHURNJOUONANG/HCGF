import { NextResponse } from "next/server";
import { confirmerWebhookMoyen } from "@/lib/webhooks-paiement";
import { verifierWebhookYousign } from "@/lib/esign";
import { confirmerSignatureEsign } from "@/lib/lot2";

const PAIEMENTS: Record<string, "paypal" | "wero" | "mtn_money" | "orange_money"> = {
  paypal: "paypal",
  wero: "wero",
  "mtn-money": "mtn_money",
  "orange-money": "orange_money",
};

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const moyen = PAIEMENTS[provider];
  if (moyen) return confirmerWebhookMoyen(moyen, request);

  if (provider === "yousign") {
    const payload = await request.text();
    const signature = request.headers.get("x-yousign-signature-256") ?? request.headers.get("x-yousign-signature") ?? "";
    const event = verifierWebhookYousign(payload, signature);
    if (!event) return NextResponse.json({ error: "signature" }, { status: 400 });
    const nom = event.event_name ?? "";
    if (!nom.includes("done") && !nom.includes("completed")) {
      return NextResponse.json({ ok: true, ignore: nom });
    }
    const demandeId = event.data?.metadata?.demandeId;
    if (!demandeId) return NextResponse.json({ error: "metadata" }, { status: 400 });
    const resultat = await confirmerSignatureEsign(demandeId);
    if (resultat && "error" in resultat) return NextResponse.json(resultat, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "inconnu" }, { status: 404 });
}
