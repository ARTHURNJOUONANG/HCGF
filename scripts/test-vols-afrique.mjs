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

const { codeIata } = await import("../src/lib/aeroports.ts");
const { chercherVols } = await import("../src/lib/catalogues.ts");
const { rechercherOffresVol, modeVol } = await import("../src/lib/duffel.ts");

const date = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
console.log("mode", modeVol());
console.log("IATA", { Douala: codeIata("Douala"), Yaounde: codeIata("Yaoundé"), Dakar: codeIata("Dakar") });
console.log(
  "demo DLA-CDG",
  chercherVols("DLA", "CDG").map((o) => o.airline),
);
const live = await rechercherOffresVol({ origin: "DLA", destination: "CDG", date });
console.log(
  "live DLA-CDG",
  live.length,
  live.slice(0, 4).map((o) => `${o.airline} ${o.from}-${o.to}`),
);
const bru = await rechercherOffresVol({ origin: "ABJ", destination: "BRU", date });
console.log("live ABJ-BRU", bru.length, bru.slice(0, 3).map((o) => o.airline));
const yul = await rechercherOffresVol({ origin: "CMN", destination: "YUL", date });
console.log("live CMN-YUL", yul.length, yul.slice(0, 3).map((o) => o.airline));
