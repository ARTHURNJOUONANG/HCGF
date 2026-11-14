import { NextResponse } from "next/server";

export function autoriserCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET manquant" }, { status: 503 });
  }
  const recu = request.headers.get("authorization");
  if (recu !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "interdit" }, { status: 401 });
  }
  return null;
}
