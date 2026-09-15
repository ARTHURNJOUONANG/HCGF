import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { entetesFichier, lireStockage } from "@/lib/fichiers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });
  const { id } = await params;
  const police = await prisma.policeAssurance.findUnique({
    where: { idDemande: id },
    include: { demande: true },
  });
  if (!police?.storagePath) return new NextResponse("Introuvable", { status: 404 });
  if (user.typeCompte !== "collaborateur" && police.demande.idUtilisateur !== user.id) {
    return new NextResponse("Interdit", { status: 403 });
  }
  const data = await lireStockage(police.storagePath);
  if (!data) return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: entetesFichier("text/html; charset=utf-8", "police.html"),
  });
}
