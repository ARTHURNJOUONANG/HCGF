import { NextResponse } from "next/server";
import { autoriserCron } from "@/lib/cron-auth";
import { traiterRelancesDues } from "@/lib/lot8";

export async function GET(request: Request) {
  const refus = autoriserCron(request);
  if (refus) return refus;
  const resultat = await traiterRelancesDues();
  return NextResponse.json({ ok: true, ...resultat });
}
