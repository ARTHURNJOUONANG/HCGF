const BASE = "http://localhost:3000";

const sante = await fetch(`${BASE}/api/sante`);
const santeJson = await sante.json();
console.log("sante", sante.ok, santeJson);

const cat = await fetch(`${BASE}/api/catalogue`);
const catJson = await cat.json();
console.log("catalogue", cat.ok, {
  pays: catJson.pays?.length,
  services: catJson.services?.length,
  offres: catJson.offres?.length,
});

const vols = await fetch(`${BASE}/api/catalogue?service=VOL&from=CDG&to=FRA`);
const volsJson = await vols.json();
console.log("vols", vols.ok, volsJson.vols?.length);

const ia = await fetch(`${BASE}/api/ia/suggestions`, { method: "POST" });
const iaJson = await ia.json();
console.log("ia-interdit", ia.status, iaJson.error);

const reprise = await fetch(`${BASE}/api/cron/reprise-api`);
const repriseJson = await reprise.json();
console.log("reprise", reprise.ok, repriseJson);
