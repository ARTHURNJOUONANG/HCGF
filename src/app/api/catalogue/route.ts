import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assurerCatalogueAssurance } from "@/lib/catalogues";
import { rechercherOffresVol } from "@/lib/duffel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const service = url.searchParams.get("service");
  const pays = url.searchParams.get("pays");

  const [paysRows, services, offres] = await Promise.all([
    prisma.pays.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.service.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.offreService.findMany({
      where: {
        actif: true,
        ...(pays ? { codePays: pays } : {}),
        ...(service ? { codeService: service } : {}),
      },
      include: { pays: true, service: true, baremes: { where: { actif: true }, orderBy: { dateEffet: "desc" }, take: 1 } },
      orderBy: [{ codePays: "asc" }, { codeService: "asc" }],
    }),
  ]);

  const body: Record<string, unknown> = {
    pays: paysRows,
    services,
    offres: offres.map((o) => ({
      id: o.id,
      pays: o.codePays,
      service: o.codeService,
      libellePays: o.pays.libelle,
      libelleService: o.service.libelle,
      texte: o.texteExplicatif,
      tarif: o.baremes[0]
        ? { version: o.baremes[0].version, montant: o.baremes[0].montant, frais: o.baremes[0].frais }
        : null,
    })),
  };

  if (service === "ASSURANCE") {
    await assurerCatalogueAssurance();
    body.formules = await prisma.formuleAssurance.findMany({
      where: { active: true },
      include: { garanties: { include: { garantie: true } } },
      orderBy: { supplement: "asc" },
    });
  }

  if (service === "VOL") {
    body.vols = await rechercherOffresVol({
      origin: url.searchParams.get("from") || "CDG",
      destination: url.searchParams.get("to") || "",
      date: url.searchParams.get("date") || undefined,
      dateRetour: url.searchParams.get("return") || undefined,
    });
    body.modeVol = (await import("@/lib/duffel")).modeVol();
  }

  return NextResponse.json(body);
}
