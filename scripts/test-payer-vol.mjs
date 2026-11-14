/**
 * Test paiement Hold → TICKETED (Duffel balance en test).
 * Run: npx tsx scripts/test-payer-vol.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/index.js";

for (const ligne of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const propre = ligne.trim();
  if (!propre || propre.startsWith("#")) continue;
  const i = propre.indexOf("=");
  if (i < 1) continue;
  const cle = propre.slice(0, i).trim();
  const valeur = propre.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[cle]) process.env[cle] = valeur;
}

function ok(label, cond, detail = "") {
  if (cond) console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Test payer billet ===\n");
  const { payerHoldDuffel, modeVol } = await import("../src/lib/duffel.ts");
  console.log("mode", modeVol());

  // Paiement démo (ordre non Duffel)
  const demo = await payerHoldDuffel({
    providerOrderId: "ORD-DEMO-123",
    montantCentimes: 10000,
    currency: "EUR",
  });
  ok("paiement démo OK", demo.ok === true, demo.ok ? demo.data.paymentId : "error" in demo ? demo.error : "");

  console.log("\n=== Fin ===\n");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
  await prisma.$disconnect();
});
