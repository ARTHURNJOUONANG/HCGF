/**
 * Test backend LOT 9 fraude (local SQLite).
 * Run: npx tsx scripts/test-fraude.mjs
 */
import { PrismaClient } from "../src/generated/prisma/index.js";
import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function sha(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function ok(label, cond, detail = "") {
  if (cond) console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("\n=== Test LOT 9 fraude ===\n");

  const {
    signalerPiecePartagee,
    signalerIdentiteInstable,
    signalerPaiementIncoherent,
    analyserDemandeFraude,
    leverAlerteFraude,
    confirmerAlerteFraude,
  } = await import("../src/lib/fraude.ts");

  const mdp = await hash("Demo2026!", 10);
  const suffix = Date.now().toString(36);

  const offre = await prisma.offreService.findFirst({
    include: { formulaire: { include: { champs: true } }, pieces: true },
  });
  if (!offre) throw new Error("Aucune offre seed — lancez prisma db seed");

  const u1 = await prisma.utilisateur.create({
    data: {
      email: `fraude1.${suffix}@avi.test`,
      motDePasseHash: mdp,
      typeCompte: "candidat",
      profil: { create: { nom: "Dupont", prenom: "Alice", dateNaissance: "2000-01-01" } },
    },
  });
  const u2 = await prisma.utilisateur.create({
    data: {
      email: `fraude2.${suffix}@avi.test`,
      motDePasseHash: mdp,
      typeCompte: "candidat",
      profil: { create: { nom: "Martin", prenom: "Bob", dateNaissance: "1999-05-05" } },
    },
  });
  const staff = await prisma.utilisateur.findFirst({ where: { typeCompte: "collaborateur" } });

  const d1 = await prisma.demande.create({
    data: {
      reference: `FRD-A-${suffix}`,
      idUtilisateur: u1.id,
      idOffre: offre.id,
      statut: "en_traitement",
    },
  });
  const d2 = await prisma.demande.create({
    data: {
      reference: `FRD-B-${suffix}`,
      idUtilisateur: u2.id,
      idOffre: offre.id,
      statut: "en_traitement",
    },
  });

  // 1) Pièce partagée
  const bytes = randomBytes(64);
  const h = sha(bytes);
  const doc1 = await prisma.document.create({
    data: {
      idDemande: d1.id,
      type: "transmis",
      nom: "passeport.pdf",
      format: "application/pdf",
      storagePath: `test/${suffix}-a.pdf`,
      hash: h,
      statut: "recu",
    },
  });
  const doc2 = await prisma.document.create({
    data: {
      idDemande: d2.id,
      type: "transmis",
      nom: "passeport-copie.pdf",
      format: "application/pdf",
      storagePath: `test/${suffix}-b.pdf`,
      hash: h,
      statut: "recu",
    },
  });

  const pieces = await signalerPiecePartagee({
    documentId: doc1.id,
    hash: h,
    idDemande: d1.id,
  });
  ok("pièce partagée crée alerte(s)", pieces.length >= 1, `${pieces.length} alerte(s)`);

  const a1 = await prisma.alerteFraude.findFirst({
    where: { idDemande: d1.id, typeSignal: "document_partage", statut: { not: "levee" } },
  });
  const a2 = await prisma.alerteFraude.findFirst({
    where: { idDemande: d2.id, typeSignal: "document_partage", statut: { not: "levee" } },
  });
  ok("alerte dossier A", Boolean(a1));
  ok("alerte dossier B (bilatéral)", Boolean(a2));

  const d1r = await prisma.demande.findUnique({ where: { id: d1.id } });
  const d2r = await prisma.demande.findUnique({ where: { id: d2.id } });
  ok("contrôle renforcé A", d1r?.controleRenforce === true);
  ok("contrôle renforcé B", d2r?.controleRenforce === true);

  // 2) Identité instable
  const champNom = offre.formulaire?.champs.find((c) => c.code === "nom");
  if (champNom) {
    await prisma.reponseFormulaire.create({
      data: { idDemande: d1.id, idChamp: champNom.id, valeur: "AutreNom" },
    });
    const idAlerte = await signalerIdentiteInstable(d1.id);
    ok("identité instable", Boolean(idAlerte), idAlerte?.detail?.slice(0, 60));
  } else {
    ok("identité instable (skip — pas de champ nom)", true);
  }

  // 3) Paiement incohérent
  await prisma.espaceFinancier.create({
    data: {
      idDemande: d1.id,
      montantAttendu: 14900,
      montantRecu: 0,
      frais: 900,
      statutFonds: "en_attente",
    },
  });
  await prisma.espaceFinancier.create({
    data: {
      idDemande: d2.id,
      montantAttendu: 14900,
      montantRecu: 0,
      frais: 900,
      statutFonds: "en_attente",
    },
  });
  const ref = `VIR-SHARED-${suffix}`;
  await prisma.operationFinanciere.create({
    data: {
      idEspace: d2.id,
      type: "virement",
      montant: 14900,
      reference: ref,
      source: "saisie",
      statut: "en_attente",
    },
  });
  const pay = await signalerPaiementIncoherent({ idDemande: d1.id, reference: ref });
  ok("paiement incohérent (réf partagée)", Boolean(pay), pay?.detail?.slice(0, 60));

  const excess = await signalerPaiementIncoherent({
    idDemande: d1.id,
    montantOperation: 50000,
  });
  ok("paiement incohérent (montant > attendu)", Boolean(excess));

  // 4) Confirmer / lever
  if (a1 && staff) {
    await confirmerAlerteFraude(a1.id, staff.id);
    const conf = await prisma.alerteFraude.findUnique({ where: { id: a1.id } });
    ok("confirmer alerte", conf?.statut === "confirmee");

    await leverAlerteFraude(a1.id, staff.id);
    const levee = await prisma.alerteFraude.findUnique({ where: { id: a1.id } });
    ok("lever alerte", levee?.statut === "levee");
  } else {
    ok("confirmer/lever (staff manquant)", Boolean(staff));
  }

  // 5) Analyse globale
  const scan = await analyserDemandeFraude(d2.id);
  ok("analyserDemandeFraude", Array.isArray(scan), `${scan.length} signal(s)`);

  // Cleanup
  await prisma.demande.deleteMany({ where: { id: { in: [d1.id, d2.id] } } });
  await prisma.utilisateur.deleteMany({
    where: { email: { in: [u1.email, u2.email] } },
  });

  const alertesRestantes = await prisma.alerteFraude.count({
    where: { statut: { not: "levee" } },
  });
  console.log(`\nAlertes actives restantes en base : ${alertesRestantes}`);
  console.log("\n=== Fin test fraude ===\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
