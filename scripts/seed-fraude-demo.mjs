import { PrismaClient } from "../src/generated/prisma/index.js";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // cleanup previous demo fraude refs
  await prisma.demande.deleteMany({ where: { reference: { startsWith: "FRD-DEMO-" } } });

  const {
    signalerPiecePartagee,
  } = await import("../src/lib/fraude.ts");

  const offre = await prisma.offreService.findFirst();
  const candidats = await prisma.utilisateur.findMany({
    where: { typeCompte: "candidat" },
    take: 2,
  });
  if (!offre || candidats.length < 1) {
    console.log("Seed catalogue + candidat d’abord.");
    return;
  }

  const u1 = candidats[0];
  let u2 = candidats[1];
  if (!u2) {
    u2 = await prisma.utilisateur.findFirst({ where: { typeCompte: "candidat", id: { not: u1.id } } });
  }
  if (!u2) {
    console.log("Il faut 2 candidats — utilise le seed démo.");
    return;
  }

  const stamp = Date.now().toString(36);
  const d1 = await prisma.demande.create({
    data: {
      reference: `FRD-DEMO-A-${stamp}`,
      idUtilisateur: u1.id,
      idOffre: offre.id,
      statut: "en_traitement",
    },
  });
  const d2 = await prisma.demande.create({
    data: {
      reference: `FRD-DEMO-B-${stamp}`,
      idUtilisateur: u2.id,
      idOffre: offre.id,
      statut: "en_traitement",
    },
  });

  const h = createHash("sha256").update(randomBytes(48)).digest("hex");
  const doc1 = await prisma.document.create({
    data: {
      idDemande: d1.id,
      type: "transmis",
      nom: "piece-test-fraude.pdf",
      format: "application/pdf",
      storagePath: `demo/fraude-${stamp}-a.pdf`,
      hash: h,
      statut: "recu",
    },
  });
  await prisma.document.create({
    data: {
      idDemande: d2.id,
      type: "transmis",
      nom: "piece-test-fraude.pdf",
      format: "application/pdf",
      storagePath: `demo/fraude-${stamp}-b.pdf`,
      hash: h,
      statut: "recu",
    },
  });

  const alertes = await signalerPiecePartagee({
    documentId: doc1.id,
    hash: h,
    idDemande: d1.id,
  });

  console.log("Scénario prêt :");
  console.log(`  Dossiers ${d1.reference} / ${d2.reference}`);
  console.log(`  Alertes créées : ${alertes.length}`);
  console.log("  UI : http://localhost:3010/bureau/fraude");
  console.log("  Login équipe : conseiller.demo@avi.test / Demo2026! (+ code PD)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
