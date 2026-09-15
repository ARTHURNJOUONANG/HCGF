import { confirmerWebhookMoyen } from "@/lib/webhooks-paiement";

export async function POST(request: Request) {
  return confirmerWebhookMoyen("wero", request);
}
