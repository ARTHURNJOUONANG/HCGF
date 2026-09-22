/**
 * Smoke RGPD — export, rétention, docs contractuels, pages.
 * Run: npx tsx scripts/test-rgpd.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { SignJWT } from "jose";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";

function chargerEnv() {
  try {
    const texte = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const ligne of texte.split(/\r?\n/)) {
      const propre = ligne.trim();
      if (!propre || propre.startsWith("#")) continue;
      const i = propre.indexOf("=");
      if (i < 1) continue;
      const cle = propre.slice(0, i).trim();
      const valeur = propre.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[cle]) process.env[cle] = valeur;
    }
  } catch {
    /* .env optionnel */
  }
}
chargerEnv();

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "avi-dev-secret");

function ok(label, cond, detail = "") {
  if (cond) console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

async function tokenFor(userId) {
  const row = await prisma.sessionAuth.create({
    data: {
      idUtilisateur: userId,
      expireAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return new SignJWT({ sid: row.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(SECRET);
}

async function main() {
  console.log("\n=== Test RGPD ===\n");
  console.log(`Base: ${BASE}\n`);

  // 1. Documents contractuels
  const { assurerDocumentsContractuels, documentsActifs } = await import("../src/lib/lot6.ts");
  await assurerDocumentsContractuels();
  const docs = await documentsActifs();
  const types = docs.map((d) => d.type).sort().join(",");
  ok("docs actifs cgv+conf+mentions", types === "cgv,confidentialite,mentions", types);
  ok("version 2026.2", docs.every((d) => d.numeroVersion === "2026.2"));
  ok("politique contient rétention", docs.some((d) => d.type === "confidentialite" && d.contenu.includes("24 mois")));

  // 2. Pages publiques
  const cgv = await fetch(`${BASE}/cgv`);
  const html = await cgv.text();
  ok("GET /cgv 200", cgv.status === 200);
  ok("/cgv affiche 2026.2", html.includes("2026.2"));
  ok("/cgv Mentions", html.includes("Mentions légales"));

  // 3. Export portabilité
  const candidat = await prisma.utilisateur.findUnique({
    where: { email: "candidat.demo@avi.test" },
    include: { profil: true },
  });
  ok("compte démo présent", Boolean(candidat));
  if (candidat) {
    const jwt = await tokenFor(candidat.id);
    const exp = await fetch(`${BASE}/api/compte/export`, {
      headers: { Cookie: `avi_session=${jwt}` },
    });
    const body = await exp.text();
    ok("GET /api/compte/export 200", exp.status === 200, String(exp.status));
    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      /* */
    }
    ok("export JSON valide", Boolean(json?.compte?.email));
    ok("export contient art. 15/20", Boolean(json?.baseLegale?.includes("15")));
    ok("export profil", Boolean(json?.profil));
    ok("Content-Disposition attachment", (exp.headers.get("content-disposition") || "").includes("hcgf-donnees.json"));
  }

  // 4. Page compte
  if (candidat) {
    const jwt = await tokenFor(candidat.id);
    const page = await fetch(`${BASE}/compte`, {
      headers: { Cookie: `avi_session=${jwt}; avi_intro=1` },
      redirect: "follow",
    });
    const t = await page.text();
    ok("GET /compte 200", page.status === 200);
    ok("compte affiche droits RGPD", t.includes("Vos droits") || t.includes("RGPD"));
    ok("compte lien export", t.includes("/api/compte/export") || t.includes("Télécharger mes données"));
  }

  // 5. Rétention : dossier ancien clôturé + pièce → purge
  const { appliquerRetentionDocuments, RETENTION_PIECES_JOURS } = await import("../src/lib/rgpd.ts");
  const { supprimerStockage } = await import("../src/lib/fichiers.ts");

  const offre = await prisma.offreService.findFirst();
  if (!offre) throw new Error("Pas d’offre");

  const mdp = await hash("Demo2026!", 10);
  const suffix = Date.now().toString(36);
  const user = await prisma.utilisateur.create({
    data: {
      email: `rgpd.${suffix}@avi.test`,
      motDePasseHash: mdp,
      typeCompte: "candidat",
      profil: { create: { nom: "Test", prenom: "Rgpd" } },
    },
  });

  const vieux = new Date(Date.now() - (RETENTION_PIECES_JOURS + 10) * 86400000);
  const demande = await prisma.demande.create({
    data: {
      idUtilisateur: user.id,
      idOffre: offre.id,
      reference: `RGPD-TEST-${suffix}`,
      statut: "cloturee",
    },
  });
  // Forcer une date ancienne (Prisma @updatedAt sinon = now). ISO obligatoire pour SQLite/Prisma.
  const vieuxIso = vieux.toISOString();
  await prisma.$executeRaw`UPDATE Demande SET updatedAt = ${vieuxIso}, createdAt = ${vieuxIso} WHERE id = ${demande.id}`;
  const verif = await prisma.demande.findUnique({
    where: { id: demande.id },
    select: { updatedAt: true, statut: true },
  });
  ok("demande datée dans le passé", verif != null && verif.updatedAt < new Date(Date.now() - 700 * 86400000), String(verif?.updatedAt));

  const storageName = `rgpd-test-${suffix}.bin`;
  const uploadDir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const fichier = path.join(uploadDir, storageName);
  await writeFile(fichier, randomBytes(64));

  const doc = await prisma.document.create({
    data: {
      idDemande: demande.id,
      type: "transmis",
      nom: "piece-test.pdf",
      format: "application/pdf",
      storagePath: storageName,
      hash: createHash("sha256").update("x").digest("hex"),
      ocrTexte: "DONNEE SENSIBLE",
      ocrStatut: "ok",
    },
  });

  const conv = await prisma.conversation.create({
    data: {
      idDemande: demande.id,
      messages: {
        create: {
          idAuteur: user.id,
          contenu: "Message privé à effacer",
        },
      },
    },
  });
  await prisma.$executeRaw`UPDATE Message SET createdAt = ${vieuxIso} WHERE idConversation = ${conv.id}`;

  const ret = await appliquerRetentionDocuments();
  ok("rétention a traité dossiers", ret.dossiers >= 1, JSON.stringify(ret));

  const docApres = await prisma.document.findUnique({ where: { id: doc.id } });
  ok("pièce storagePath vidé", docApres?.storagePath === "");
  ok("OCR effacé", docApres?.ocrTexte === "" && docApres?.ocrStatut === "efface_rgpd");
  ok("fichier disque supprimé", !(await import("fs").then((fs) => fs.existsSync(fichier))));

  const msg = await prisma.message.findFirst({ where: { idConversation: conv.id } });
  ok("message anonymisé", Boolean(msg?.contenu?.startsWith("[message effacé")));

  // cleanup
  await prisma.demande.delete({ where: { id: demande.id } });
  await prisma.utilisateur.delete({ where: { id: user.id } });
  try {
    await unlink(fichier);
  } catch {
    /* déjà purgé */
  }
  await supprimerStockage(storageName);

  console.log("\n=== Fin test RGPD ===\n");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
  await prisma.$disconnect();
});
