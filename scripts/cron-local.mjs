import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    /* .env optionnel si les variables sont déjà dans l’environnement */
  }
}

chargerEnv();

const base = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET manquant. Ajoutez-le dans .env (gratuit, généré localement).");
  process.exit(1);
}

const routes = ["/api/cron/relances", "/api/cron/reprise-api", "/api/cron/maintenance"];

for (const route of routes) {
  const res = await fetch(`${base}${route}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`${route} → ${res.status}\n${body.slice(0, 800)}\n`);
  if (!res.ok) process.exitCode = 1;
}
