import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { etatServices } from "@/lib/sante";
import { assurerFournisseurs } from "@/lib/fournisseurs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await assurerFournisseurs();
    return NextResponse.json({ ok: true, ...etatServices() });
  } catch (erreur) {
    return NextResponse.json(
      { ok: false, error: erreur instanceof Error ? erreur.message : "base" },
      { status: 503 },
    );
  }
}
