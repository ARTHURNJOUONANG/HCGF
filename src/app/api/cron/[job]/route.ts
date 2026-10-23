import { NextResponse } from "next/server";
import { autoriserCron } from "@/lib/cron-auth";
import { rejouerOperationsIndisponibles } from "@/lib/fournisseurs";
import { classerOperationsApiStale, executerMaintenance } from "@/lib/maintenance";
import { traiterRelancesDues } from "@/lib/lot8";

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const refus = autoriserCron(request);
  if (refus) return refus;
  const { job } = await params;

  if (job === "relances") {
    const resultat = await traiterRelancesDues();
    return NextResponse.json({ ok: true, ...resultat });
  }
  if (job === "reprise-api") {
    const [file, stale] = await Promise.all([rejouerOperationsIndisponibles(), classerOperationsApiStale()]);
    return NextResponse.json({
      ok: true,
      ...file,
      ...stale,
      note: "Les appels métier réutilisent la même clé d’idempotence pour retenter.",
    });
  }
  if (job === "maintenance") {
    const resultat = await executerMaintenance();
    return NextResponse.json({ ok: true, ...resultat });
  }
  return NextResponse.json({ error: "inconnu" }, { status: 404 });
}
