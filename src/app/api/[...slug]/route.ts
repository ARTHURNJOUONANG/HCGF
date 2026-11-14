import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { aLeDroit, droitsSurDemande } from "@/lib/delegation";
import { entetesFichier, lireStockage } from "@/lib/fichiers";
import { confirmerWebhookMoyen } from "@/lib/webhooks-paiement";
import { verifierWebhookYousign } from "@/lib/esign";
import { confirmerSignatureEsign } from "@/lib/lot2";
import { autoriserCron } from "@/lib/cron-auth";
import { rejouerOperationsIndisponibles } from "@/lib/fournisseurs";
import { classerOperationsApiStale, executerMaintenance } from "@/lib/maintenance";
import { traiterRelancesDues } from "@/lib/lot8";
import { assurerCatalogueAssurance } from "@/lib/catalogues";
import { rechercherOffresVol, modeVol } from "@/lib/duffel";
import { etatServices } from "@/lib/sante";
import { assurerFournisseurs } from "@/lib/fournisseurs";
import { assurerPaysOuverts } from "@/lib/ouvrir-catalogue";
import { statutPartenaire } from "@/lib/partenaire";
import { analyserDossier, iaPeut } from "@/lib/ia-metier";
import { exporterDonnees } from "@/lib/rgpd";

const PAIEMENTS: Record<string, "paypal" | "wero" | "mtn_money" | "orange_money"> = {
  paypal: "paypal",
  wero: "wero",
  "mtn-money": "mtn_money",
  "orange-money": "orange_money",
};

function chemin(slug: string[]) {
  return slug.join("/");
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const p = chemin(slug);

  if (p.startsWith("cron/")) {
    const refus = autoriserCron(request);
    if (refus) return refus;
    const job = slug[1];
    if (job === "relances") return NextResponse.json({ ok: true, ...(await traiterRelancesDues()) });
    if (job === "reprise-api") {
      const [file, stale] = await Promise.all([rejouerOperationsIndisponibles(), classerOperationsApiStale()]);
      return NextResponse.json({ ok: true, ...file, ...stale, note: "Les appels métier réutilisent la même clé d’idempotence pour retenter." });
    }
    if (job === "maintenance") return NextResponse.json({ ok: true, ...(await executerMaintenance()) });
    return NextResponse.json({ error: "inconnu" }, { status: 404 });
  }

  if (slug[0] === "dl" && slug.length === 3) {
    return telecharger(slug[1], slug[2]);
  }

  if (p === "sante") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await assurerFournisseurs();
      await assurerPaysOuverts();
      return NextResponse.json({ ok: true, ...etatServices() });
    } catch (erreur) {
      return NextResponse.json({ ok: false, error: erreur instanceof Error ? erreur.message : "base" }, { status: 503 });
    }
  }

  if (p === "catalogue") {
    await assurerPaysOuverts();
    const url = new URL(request.url);
    const service = url.searchParams.get("service");
    const pays = url.searchParams.get("pays");
    const [paysRows, services, offres] = await Promise.all([
      prisma.pays.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
      prisma.service.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
      prisma.offreService.findMany({
        where: { actif: true, ...(pays ? { codePays: pays } : {}), ...(service ? { codeService: service } : {}) },
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
        tarif: o.baremes[0] ? { version: o.baremes[0].version, montant: o.baremes[0].montant, frais: o.baremes[0].frais } : null,
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
      body.modeVol = modeVol();
    }
    return NextResponse.json(body);
  }

  if (p === "partenaire/statuts") {
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
      dossiers: dossiers.map((d) => ({ id: d.id, reference: d.reference, statut: statutPartenaire(d.statut), maj: d.dateDerniereActivite })),
    });
  }

  if (p === "ia/suggestions") {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const demandeId = new URL(request.url).searchParams.get("demandeId");
    if (!demandeId) return NextResponse.json({ error: "demandeId" }, { status: 400 });
    const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
    if (!aLeDroit(droits, "consulter")) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
    const analyse = await analyserDossier(demandeId);
    return NextResponse.json({ ...analyse, suggestions: analyse.suggestions.filter((s) => iaPeut(s.code)) });
  }

  if (p === "compte/export") {
    const resultat = await exporterDonnees();
    if ("error" in resultat) return NextResponse.json(resultat, { status: 401 });
    return new NextResponse(JSON.stringify(resultat.donnees, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="hcgf-donnees.json"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return NextResponse.json({ error: "inconnu" }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const p = chemin(slug);

  if (slug[0] === "webhooks" && slug[1]) {
    const moyen = PAIEMENTS[slug[1]];
    if (moyen) return confirmerWebhookMoyen(moyen, request);
    if (slug[1] === "yousign") {
      const payload = await request.text();
      const signature = request.headers.get("x-yousign-signature-256") ?? request.headers.get("x-yousign-signature") ?? "";
      const event = verifierWebhookYousign(payload, signature);
      if (!event) return NextResponse.json({ error: "signature" }, { status: 400 });
      const nom = event.event_name ?? "";
      if (!nom.includes("done") && !nom.includes("completed")) return NextResponse.json({ ok: true, ignore: nom });
      const demandeId = event.data?.metadata?.demandeId;
      if (!demandeId) return NextResponse.json({ error: "metadata" }, { status: 400 });
      const resultat = await confirmerSignatureEsign(demandeId);
      if (resultat && "error" in resultat) return NextResponse.json(resultat, { status: 422 });
      return NextResponse.json({ ok: true });
    }
  }

  if (p === "ia/suggestions") {
    return NextResponse.json({ error: "L’IA ne signe pas, ne paie pas et ne valide pas à quatre yeux." }, { status: 403 });
  }

  return NextResponse.json({ error: "inconnu" }, { status: 404 });
}

async function telecharger(kind: string, id: string) {
  const user = await requireUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  if (kind === "fichiers") {
    const doc = await prisma.document.findUnique({ where: { id }, include: { demande: true } });
    if (!doc) return new NextResponse("Introuvable", { status: 404 });
    const droits = await droitsSurDemande(user.id, user.typeCompte, doc.demande.id);
    if (!aLeDroit(droits, "consulter")) return new NextResponse("Interdit", { status: 403 });
    const data = await lireStockage(doc.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), { headers: entetesFichier(doc.format || "application/octet-stream", doc.nom) });
  }
  if (kind === "pieces-comptables") {
    const piece = await prisma.pieceComptable.findUnique({ where: { id }, include: { demande: true } });
    if (!piece) return new NextResponse("Introuvable", { status: 404 });
    const droits = await droitsSurDemande(user.id, user.typeCompte, piece.demande.id);
    if (!aLeDroit(droits, "consulter")) return new NextResponse("Interdit", { status: 403 });
    const data = await lireStockage(piece.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), { headers: entetesFichier("text/html; charset=utf-8", `${piece.nom}.html`) });
  }
  if (kind === "police") {
    const police = await prisma.policeAssurance.findUnique({ where: { idDemande: id }, include: { demande: true } });
    if (!police?.storagePath) return new NextResponse("Introuvable", { status: 404 });
    if (user.typeCompte !== "collaborateur" && police.demande.idUtilisateur !== user.id) return new NextResponse("Interdit", { status: 403 });
    const data = await lireStockage(police.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), { headers: entetesFichier("text/html; charset=utf-8", "police.html") });
  }
  if (kind === "justificatif-vol") {
    const piece = await prisma.justificatifVol.findUnique({ where: { idReservation: id }, include: { reservation: true } });
    if (!piece) return new NextResponse("Introuvable", { status: 404 });
    if (user.typeCompte !== "collaborateur" && piece.reservation.idUtilisateur !== user.id) return new NextResponse("Interdit", { status: 403 });
    const data = await lireStockage(piece.storagePath);
    if (!data) return new NextResponse("Introuvable", { status: 404 });
    return new NextResponse(new Uint8Array(data), { headers: entetesFichier("text/html; charset=utf-8", "justificatif-vol.html") });
  }
  return new NextResponse("Introuvable", { status: 404 });
}
