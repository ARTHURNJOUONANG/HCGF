/**
 * Test acceptation confidentialité à la connexion (refus serveur + UI via HTTP).
 * Run: npx tsx scripts/test-login-conf.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const ligne of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const propre = ligne.trim();
  if (!propre || propre.startsWith("#")) continue;
  const i = propre.indexOf("=");
  if (i < 1) continue;
  const cle = propre.slice(0, i).trim();
  const valeur = propre.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[cle]) process.env[cle] = valeur;
}

const BASE = process.env.BASE_URL ?? "http://localhost:3010";

function ok(label, cond, detail = "") {
  if (cond) console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("\n=== Test login + confidentialité ===\n");

  const page = await fetch(`${BASE}/connexion`);
  const html = await page.text();
  ok("page connexion 200", page.status === 200);
  ok("bloc politique visible", html.includes("Politique de confidentialité"));
  ok("version 2026.2", html.includes("2026.2"));
  ok("case obligatoire", html.includes("obligatoire pour continuer"));
  ok("bouton soumis à acceptation (disabled tant que non coché)", html.includes("disabled") || html.includes("accepte"));

  const { connecter } = await import("../src/lib/actions.ts");

  const refuse = await connecter({
    email: "candidat.demo@avi.test",
    password: "Demo2026!",
    role: "candidat",
    codeAcces: "",
    acceptConfidentialite: false,
  });
  ok(
    "refus serveur sans acceptation",
    refuse?.error === "Acceptez la politique de confidentialité pour continuer.",
    refuse?.error,
  );

  const refuseOmis = await connecter({
    email: "candidat.demo@avi.test",
    password: "x",
    role: "candidat",
    codeAcces: "",
  });
  ok(
    "refus serveur si champ omis",
    refuseOmis?.error === "Acceptez la politique de confidentialité pour continuer.",
    refuseOmis?.error,
  );

  console.log("\n=== Fin ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
