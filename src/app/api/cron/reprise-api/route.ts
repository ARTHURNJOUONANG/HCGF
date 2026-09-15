import { NextResponse } from "next/server";
import { autoriserCron } from "@/lib/cron-auth";
import { rejouerOperationsIndisponibles } from "@/lib/fournisseurs";
import { classerOperationsApiStale } from "@/lib/maintenance";

export async function GET(request: Request) {
  const refus = autoriserCron(request);
  if (refus) return refus;
  const [file, stale] = await Promise.all([rejouerOperationsIndisponibles(), classerOperationsApiStale()]);
  return NextResponse.json({
    ok: true,
    ...file,
    ...stale,
    note: "Les appels métier réutilisent la même clé d’idempotence pour retenter.",
  });
}
