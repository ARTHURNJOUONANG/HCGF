import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { entetesFichier, lireStockage } from "@/lib/fichiers";
import { aLeDroit, droitsSurDemande } from "@/lib/delegation";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await requireUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });
  const { kind, id } = await params;

  if (kind === "fichiers") {
    const doc = await prisma.document.findUnique({ where: { id }, include: { demande: true } });
    if (!doc) return new NextResponse("Introuvable", { status: 404 });
    const droits = await droitsSurDemande(user.id, user.typeCompte, doc.demande.id);
    if (!aLeDroit(droits, "consulter")) return new NextResponse("Interdit", { status: 403 });
    const data = await lireStockage(doc.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), {
      headers: entetesFichier(doc.format || "application/octet-stream", doc.nom),
    });
  }

  if (kind === "pieces-comptables") {
    const piece = await prisma.pieceComptable.findUnique({ where: { id }, include: { demande: true } });
    if (!piece) return new NextResponse("Introuvable", { status: 404 });
    const droits = await droitsSurDemande(user.id, user.typeCompte, piece.demande.id);
    if (!aLeDroit(droits, "consulter")) return new NextResponse("Interdit", { status: 403 });
    const data = await lireStockage(piece.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), {
      headers: entetesFichier("text/html; charset=utf-8", `${piece.nom}.html`),
    });
  }

  if (kind === "police") {
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

  if (kind === "justificatif-vol") {
    const piece = await prisma.justificatifVol.findUnique({
      where: { idReservation: id },
      include: { reservation: true },
    });
    if (!piece) return new NextResponse("Introuvable", { status: 404 });
    if (user.typeCompte !== "collaborateur" && piece.reservation.idUtilisateur !== user.id) {
      return new NextResponse("Interdit", { status: 403 });
    }
    const data = await lireStockage(piece.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), {
      headers: entetesFichier("text/html; charset=utf-8", "justificatif-vol.html"),
    });
  }

  return new NextResponse("Introuvable", { status: 404 });
}
