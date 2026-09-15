import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { statutPartenaire } from "@/lib/partenaire";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.typeCompte !== "partenaire" || !user.idPartenaire) {
    return NextResponse.json({ error: "Espace partenaire uniquement." }, { status: 403 });
  }

  const dossiers = await prisma.demande.findMany({
    where: { idPartenaire: user.idPartenaire },
    select: { id: true, reference: true, statut: true, dateDerniereActivite: true },
    orderBy: { dateDerniereActivite: "desc" },
  });

  return NextResponse.json({
    statutsAutorises: ["DRAFT", "IN_PROGRESS", "VALID", "CLOSED", "CANCELLED"],
    dossiers: dossiers.map((d) => ({
      id: d.id,
      reference: d.reference,
      statut: statutPartenaire(d.statut),
      maj: d.dateDerniereActivite,
    })),
  });
}
