import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { analyserDossier, iaPeut } from "@/lib/ia-metier";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const demandeId = new URL(request.url).searchParams.get("demandeId");
  if (!demandeId) return NextResponse.json({ error: "demandeId" }, { status: 400 });

  const { aLeDroit, droitsSurDemande } = await import("@/lib/delegation");
  const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
  if (!aLeDroit(droits, "consulter")) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const analyse = await analyserDossier(demandeId);
  return NextResponse.json({
    ...analyse,
    suggestions: analyse.suggestions.filter((s) => iaPeut(s.code)),
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "L’IA ne signe pas, ne paie pas et ne valide pas à quatre yeux." },
    { status: 403 },
  );
}
