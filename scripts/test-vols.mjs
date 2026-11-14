/**
 * Smoke service aérien (catalogue démo + IATA).
 * Avec DUFFEL_API_KEY : tente aussi un appel live.
 * Run: npx tsx scripts/test-vols.mjs
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

function ok(label, cond, detail = "") {
  if (cond) console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("\n=== Test vols / Duffel ===\n");
  const { modeVol, codeIata, rechercherOffresVol } = await import("../src/lib/duffel.ts");

  ok("codeIata Paris → CDG", codeIata("Paris") === "CDG");
  ok("codeIata CDG", codeIata("CDG") === "CDG");
  ok("codeIata Francfort", codeIata("Francfort") === "FRA");

  const mode = modeVol();
  console.log(`  Mode : ${mode}`);

  const offres = await rechercherOffresVol({
    origin: "CDG",
    destination: "FRA",
    date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
  });
  ok("recherche retourne des offres", offres.length > 0, `${offres.length} offre(s)`);
  ok("au moins une offre Hold", offres.some((o) => o.hold));
  if (mode === "duffel") {
    ok("offres live Duffel (off_…)", offres.some((o) => o.code.startsWith("off_")), offres[0]?.code);
  } else {
    ok("catalogue démo actif sans clé", offres.every((o) => !o.code.startsWith("off_")));
  }

  console.log("\n=== Fin ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
