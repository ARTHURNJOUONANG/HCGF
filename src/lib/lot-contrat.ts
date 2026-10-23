import { createHash } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { aLeDroit, droitsSurDemande } from "./delegation";
import { ecrireStockage } from "./fichiers";
import { hashBuffer } from "./ocr";
import { ecrireAudit } from "./lot2";
import { assurerDocumentsContractuels } from "./lot6";
import { htmlContratAvi } from "./contrat-avi";

function ipDepuis(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
}

export async function assurerModeleContratAvi() {
  await assurerDocumentsContractuels();
  await prisma.documentContractuel.upsert({
    where: { type_numeroVersion: { type: "contrat_avi", numeroVersion: "2026.1" } },
    update: { actif: true, contenu: "Contrat de prestations de services AVI — modèle officiel 2026.1" },
    create: {
      type: "contrat_avi",
      numeroVersion: "2026.1",
      contenu: "Contrat de prestations de services AVI — modèle officiel 2026.1",
      actif: true,
    },
  });
}

export async function signerContratAvi(demandeId: string) {
  const user = await requireUser();
  if (!user) return { error: "Session expirée." };
  const droits = await droitsSurDemande(user.id, user.typeCompte, demandeId);
  if (!aLeDroit(droits, "repondre")) return { error: "Ce droit n’est pas délégué." };

  const demande = await prisma.demande.findFirst({
    where: { id: demandeId },
    include: {
      reponses: { include: { champ: true } },
      offre: { include: { pays: true, service: true } },
      utilisateur: { include: { profil: true } },
      documents: true,
      checklist: true,
    },
  });
  if (!demande) return { error: "Dossier introuvable." };
  if (demande.offre.codeService !== "AVI") return { error: "Ce contrat concerne uniquement l’AVI." };
  if (["cloturee", "abandonnee", "annulee"].includes(demande.statut)) {
    return { error: "Ce dossier ne peut plus être modifié." };
  }
  const deja = demande.documents.find((d) => d.type === "contrat" && d.statut === "signe");
  if (deja) return { ok: true, documentId: deja.id };

  const map: Record<string, string> = {};
  for (const r of demande.reponses) map[r.champ.code] = r.valeur;
  const nom = `${(map.nom || demande.utilisateur.profil?.nom || "").trim()} ${(map.prenom || demande.utilisateur.profil?.prenom || "").trim()}`.trim();
  if (!nom || !(map.etablissement || "").trim()) {
    return { error: "Complétez d’abord le formulaire (identité et établissement)." };
  }

  await assurerModeleContratAvi();
  const modele = await prisma.documentContractuel.findFirst({
    where: { type: "contrat_avi", actif: true },
    orderBy: { datePublication: "desc" },
  });
  if (!modele) return { error: "Modèle de contrat indisponible." };

  const preuve = createHash("sha256").update(`${user.id}:${demande.id}:${Date.now()}`).digest("hex").slice(0, 24);
  const signature = {
    date: new Date(),
    lieu: "Paris",
    nomSignataire: nom,
    preuve,
  };
  const html = htmlContratAvi({ dossier: demande, signature });
  const filename = `${demande.reference}-contrat-${Date.now()}.html`;
  await ecrireStockage(filename, html);

  const doc = await prisma.document.create({
    data: {
      idDemande: demande.id,
      idAuteur: user.id,
      type: "contrat",
      nom: `Contrat AVI ${demande.reference}`,
      format: "text/html",
      storagePath: filename,
      hash: hashBuffer(html),
      statut: "signe",
      origine: "candidat",
      ocrJson: JSON.stringify({ preuve, type: "contrat_avi" }),
    },
  });

  const h = await headers();
  await prisma.acceptation.create({
    data: {
      idUtilisateur: user.id,
      idDocumentContractuel: modele.id,
      idDemande: demande.id,
      adresseIp: ipDepuis(h),
      preuve,
    },
  });

  const item = demande.checklist.find((c) => c.libelle === "Contrat AVI");
  if (item) {
    await prisma.itemChecklist.update({ where: { id: item.id }, data: { statut: "fait" } });
  } else {
    await prisma.itemChecklist.create({
      data: { idDemande: demande.id, libelle: "Contrat AVI", statut: "fait", ordre: 19 },
    });
  }

  const etapes = JSON.parse(demande.offre.etapesParcours) as string[];
  const data: { dateDerniereActivite: Date; etapeCourante?: string } = { dateDerniereActivite: new Date() };
  if (demande.etapeCourante === "formulaire" && etapes.includes("contrat")) data.etapeCourante = "contrat";
  await prisma.demande.update({ where: { id: demande.id }, data });

  await ecrireAudit(user.id, "contrat_signe", "document", doc.id, demande.id, preuve);
  revalidatePath(`/demandes/${demande.id}`);
  revalidatePath(`/bureau/demandes/${demande.id}`);
  return { ok: true, documentId: doc.id };
}
