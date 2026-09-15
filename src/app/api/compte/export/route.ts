import { NextResponse } from "next/server";
import { exporterDonnees } from "@/lib/rgpd";

export async function GET() {
  const resultat = await exporterDonnees();
  if ("error" in resultat) {
    return NextResponse.json(resultat, { status: 401 });
  }
  return new NextResponse(JSON.stringify(resultat.donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hcgf-donnees.json"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
