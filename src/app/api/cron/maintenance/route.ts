import { NextResponse } from "next/server";
import { autoriserCron } from "@/lib/cron-auth";
import { executerMaintenance } from "@/lib/maintenance";

export async function GET(request: Request) {
  const refus = autoriserCron(request);
  if (refus) return refus;
  const resultat = await executerMaintenance();
  return NextResponse.json({ ok: true, ...resultat });
}
