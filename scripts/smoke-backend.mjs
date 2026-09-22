import { PrismaClient } from "../src/generated/prisma/index.js";
import { SignJWT } from "jose";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "avi-dev-secret");
const PASS = "Demo2026!";

const results = [];
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "OK " : "KO "} ${name}${detail ? " — " + detail : ""}`);
}

async function tokenFor(user) {
  return new SignJWT({
    id: user.id,
    email: user.email,
    nom: user.profil?.nom ?? "",
    prenom: user.profil?.prenom ?? "",
    typeCompte: user.typeCompte,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(SECRET);
}

async function hit(path, jwt, follow = false) {
  const r = await fetch(BASE + path, {
    redirect: follow ? "follow" : "manual",
    headers: {
      Cookie: jwt ? `avi_session=${jwt}; avi_intro=1` : "avi_intro=1",
    },
  });
  const loc =
    r.headers.get("location") ??
    r.headers.get("x-nextjs-redirect") ??
    r.headers.get("x-action-redirect") ??
    "";
  const text = follow || r.status === 200 || r.status === 307 || r.status === 303 ? await r.text() : "";
  return { status: r.status, loc, text, url: r.url };
}

function pageRole(text) {
  if (text.includes("File du jour")) return "bureau";
  if (text.includes("Mes demandes")) return "candidat";
  if (text.includes("Dossiers autorisés")) return "delegue";
  if (text.includes("Ouvrir la session")) return "connexion";
  if (text.includes("Initier") || text.includes("Commissions")) return "partenaire";
  return "autre";
}

function locPath(loc) {
  try {
    return loc.startsWith("http") ? new URL(loc).pathname : loc.split("?")[0];
  } catch {
    return loc;
  }
}

async function main() {
  const emails = [
    "candidat.demo@avi.test",
    "conseiller.demo@avi.test",
    "signataire.demo@avi.test",
    "partenaire.demo@avi.test",
    "delegue.demo@avi.test",
  ];

  const users = {};
  for (const email of emails) {
    const u = await prisma.utilisateur.findUnique({
      where: { email },
      include: { profil: true },
    });
    users[email] = u;
    ok(`compte ${email}`, Boolean(u), u ? `${u.typeCompte}/${u.role}` : "absent");
    if (u) {
      ok(`mot de passe ${email}`, await compare(PASS, u.motDePasseHash));
      ok(`mauvais mot de passe ${email} rejeté`, !(await compare("WrongPass!", u.motDePasseHash)));
    }
  }

  const pays = await prisma.pays.count();
  const services = await prisma.service.count();
  const offres = await prisma.offreService.count();
  ok("catalogue 4 pays", pays === 4, String(pays));
  ok("catalogue 4 services", services === 4, String(services));
  ok("offres paramétrées", offres >= 8, String(offres));

  const anonBureau = await hit("/bureau");
  ok("anonyme /bureau → connexion", anonBureau.status >= 300 && locPath(anonBureau.loc) === "/connexion", `${anonBureau.status} ${anonBureau.loc}`);
  const anonDemandes = await hit("/demandes/nouvelle");
  ok("anonyme /demandes/nouvelle → connexion", anonDemandes.status >= 300 && locPath(anonDemandes.loc) === "/connexion", `${anonDemandes.status}`);
  const anonFichier = await fetch(BASE + "/api/fichiers/inconnu", { headers: { Cookie: "avi_intro=1" } });
  ok("API fichier sans session = 401", anonFichier.status === 401, String(anonFichier.status));

  const intro = await fetch(BASE + "/connexion", { redirect: "manual" });
  ok("sans intro /connexion redirige vers accueil", intro.status >= 300 && locPath(intro.headers.get("location") ?? "").includes("/"), `${intro.status} ${intro.headers.get("location")}`);

  const tokens = {};
  for (const email of emails) {
    if (users[email]) tokens[email] = await tokenFor(users[email]);
  }

  const cand = tokens["candidat.demo@avi.test"];
  const cons = tokens["conseiller.demo@avi.test"];
  const sign = tokens["signataire.demo@avi.test"];
  const part = tokens["partenaire.demo@avi.test"];
  const delg = tokens["delegue.demo@avi.test"];

  const tdbCand = await hit("/tableau-de-bord", cand, true);
  ok("candidat tableau de bord", tdbCand.status === 200 && tdbCand.text.includes("Mes demandes") && !tdbCand.text.includes("Application error"), `status ${tdbCand.status}`);

  const bureauCand = await hit("/bureau", cand, true);
  ok("candidat /bureau refusé", pageRole(bureauCand.text) !== "bureau", `${bureauCand.status} page=${pageRole(bureauCand.text)}`);

  const partCand = await hit("/partenaire", cand, true);
  ok("candidat /partenaire renvoyé", pageRole(partCand.text) !== "partenaire", `${partCand.status} page=${pageRole(partCand.text)}`);

  const bureauCons = await hit("/bureau", cons, true);
  ok("controleur file du jour", bureauCons.status === 200 && pageRole(bureauCons.text) === "bureau", `status ${bureauCons.status}`);

  const tdbCons = await hit("/tableau-de-bord", cons, true);
  ok("controleur /tableau-de-bord → bureau", pageRole(tdbCons.text) === "bureau", `${tdbCons.status} page=${pageRole(tdbCons.text)}`);

  const bureauSign = await hit("/bureau", sign, true);
  ok("administrateur bureau", bureauSign.status === 200 && pageRole(bureauSign.text) === "bureau", `status ${bureauSign.status}`);

  const partHome = await hit("/partenaire", part, true);
  ok("partenaire espace", partHome.status === 200 && pageRole(partHome.text) === "partenaire", `status ${partHome.status} page=${pageRole(partHome.text)}`);

  const tdbPart = await hit("/tableau-de-bord", part, true);
  ok("partenaire /tableau-de-bord → partenaire", pageRole(tdbPart.text) === "partenaire", `${tdbPart.status} page=${pageRole(tdbPart.text)}`);

  const delHome = await hit("/delegue", delg, true);
  ok("déléguataire espace", delHome.status === 200 && pageRole(delHome.text) === "delegue", `status ${delHome.status}`);

  const tdbDel = await hit("/tableau-de-bord", delg, true);
  ok("déléguataire /tableau-de-bord → delegue", pageRole(tdbDel.text) === "delegue", `${tdbDel.status} page=${pageRole(tdbDel.text)}`);

  const bureauPart = await hit("/bureau", part, true);
  ok("partenaire /bureau refusé", pageRole(bureauPart.text) !== "bureau", `${bureauPart.status} page=${pageRole(bureauPart.text)}`);

  const bureauDel = await hit("/bureau", delg, true);
  ok("déléguataire /bureau refusé", pageRole(bureauDel.text) !== "bureau", `${bureauDel.status} page=${pageRole(bureauDel.text)}`);

  const demandes = await prisma.demande.findMany({
    where: { utilisateur: { email: "candidat.demo@avi.test" } },
    take: 1,
  });
  const d0 = demandes[0];
  ok("candidat a au moins un dossier", Boolean(d0));

  if (d0) {
    const pageCand = await hit(`/demandes/${d0.id}`, cand, true);
    ok("candidat ouvre son dossier", pageCand.status === 200 && pageCand.text.includes(d0.reference ?? "Formulaire"), `status ${pageCand.status}`);

    const pageCons = await hit(`/demandes/${d0.id}`, cons, true);
    ok(
      "controleur /demandes/[id] bloqué (espace candidat)",
      !pageCons.text.includes(d0.reference) || pageRole(pageCons.text) === "bureau" || pageRole(pageCons.text) === "connexion",
      `${pageCons.status} page=${pageRole(pageCons.text)}`,
    );

    const fiche = await hit(`/bureau/demandes/${d0.id}`, cons, true);
    ok("controleur fiche bureau", fiche.status === 200 && !fiche.text.includes("Application error"), `status ${fiche.status}`);

    const ficheCand = await hit(`/bureau/demandes/${d0.id}`, cand, true);
    ok("candidat fiche bureau refusée", pageRole(ficheCand.text) !== "bureau" && !ficheCand.text.includes("Back-office"), `${ficheCand.status} page=${pageRole(ficheCand.text)}`);

    const pagePart = await hit(`/demandes/${d0.id}`, part, true);
    ok("partenaire /demandes/[id] renvoyé", pageRole(pagePart.text) === "partenaire", `${pagePart.status} page=${pageRole(pagePart.text)}`);
  }

  const routesStaff = ["/bureau/taches", "/bureau/finance", "/bureau/fraude", "/bureau/partenaires", "/bureau/exploitation", "/bureau/audit"];
  for (const p of routesStaff) {
    const r = await hit(p, cons, true);
    ok(`controleur ${p}`, r.status === 200 && !r.text.includes("Application error") && !r.text.includes("Parsing CSS"), `status ${r.status}`);
  }

  const routesCand = ["/demandes/nouvelle", "/delegations", "/vols", "/notifications", "/mot-de-passe"];
  for (const p of routesCand) {
    const r = await hit(p, cand, true);
    ok(`candidat ${p}`, r.status === 200 && !r.text.includes("Application error"), `status ${r.status}`);
  }

  const nf = await hit("/page-absente-audit", cand, true);
  ok("404 métier", nf.status === 404 && nf.text.includes("n’existe pas"), `status ${nf.status}`);

  const isolation = await prisma.demande.findMany({
    include: { utilisateur: true },
  });
  const etrangeres = isolation.filter((d) => d.utilisateur.email !== "candidat.demo@avi.test");
  ok("dossiers démo isolés sur Amina", etrangeres.length === 0, `${etrangeres.length} hors candidat`);

  const finance = await prisma.espaceFinancier.count();
  ok("espaces financiers présents", finance > 0, String(finance));

  const failLoginPage = await hit("/connexion", undefined, true);
  ok("page connexion (intro)", failLoginPage.status === 200 && failLoginPage.text.includes("Ouvrir la session"), `status ${failLoginPage.status}`);

  const failed = results.filter((r) => !r.pass);
  console.log("\n---");
  console.log(`${results.filter((r) => r.pass).length}/${results.length} OK`);
  if (failed.length) {
    console.log("Échecs :");
    for (const f of failed) console.log(" - " + f.name + (f.detail ? " (" + f.detail + ")" : ""));
  }
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
