import { PrismaClient } from "../src/generated/prisma/index.js";

const p = new PrismaClient();

function looksBad(s) {
  if (s == null) return false;
  return /^\d{4}-\d{2}-\d{2} /.test(String(s));
}

function toIso(s) {
  const t = String(s).trim().replace(" ", "T");
  const d = new Date(t.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(t) ? t : `${t}Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`bad date ${s}`);
  return d.toISOString();
}

// Fix known bad Demande first
const badId = "cmub7kzeq000cts6ondhy2jk9";
const bad = await p.$queryRawUnsafe(
  `SELECT CAST(createdAt AS TEXT) as createdAt, CAST(updatedAt AS TEXT) as updatedAt FROM Demande WHERE id = ?`,
  badId,
);
console.log("before", bad[0]);
if (looksBad(bad[0]?.createdAt) || looksBad(bad[0]?.updatedAt)) {
  await p.$executeRawUnsafe(
    `UPDATE Demande SET createdAt = ?, updatedAt = ? WHERE id = ?`,
    toIso(bad[0].createdAt),
    toIso(bad[0].updatedAt),
    badId,
  );
  console.log("fixed Demande", badId);
}

// Scan all tables casting dates as TEXT
const tables = await p.$queryRawUnsafe(
  `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'`,
);

let fixes = 0;
for (const { name } of tables) {
  const info = await p.$queryRawUnsafe(`PRAGMA table_info(${name})`);
  const candidates = info
    .map((c) => c.name)
    .filter((n) => /At$|Date|expires|Expires|By$|debut|fin/i.test(n) && !/^dateDebut$|^dateFin$|^dateSaisie$/.test(n));
  // dateDebut/dateFin on Police are String fields - skip those that are intentionally strings... actually dateSaisie is DateTime

  const dateLike = info
    .map((c) => c.name)
    .filter((n) => /(At|DateTime|createdAt|updatedAt|dateDerniere|dateEmission|dateSaisie|expires|Expires|paymentRequired|derniereConnexion|expireAt|valideJusqu)/i.test(n));

  if (!dateLike.length) continue;

  const select = ["rowid as rid", ...dateLike.map((c) => `CAST(${c} AS TEXT) as ${c}`)].join(", ");
  let rows;
  try {
    rows = await p.$queryRawUnsafe(`SELECT ${select} FROM ${name}`);
  } catch (e) {
    console.error("skip table", name, e.meta?.message);
    continue;
  }

  for (const row of rows) {
    const sets = [];
    const vals = [];
    for (const col of dateLike) {
      if (looksBad(row[col])) {
        const iso = toIso(row[col]);
        sets.push(`${col} = ?`);
        vals.push(iso);
        console.log(`fix ${name}.${col} rid=${row.rid}: ${row[col]} -> ${iso}`);
      }
    }
    if (sets.length) {
      vals.push(row.rid);
      await p.$executeRawUnsafe(`UPDATE ${name} SET ${sets.join(", ")} WHERE rowid = ?`, ...vals);
      fixes += sets.length;
    }
  }
}

console.log("Fixed fields:", fixes);

try {
  const d = await p.demande.findMany({
    include: {
      utilisateur: { include: { profil: true } },
      offre: { include: { pays: true, service: true } },
      taches: { where: { statut: "a_faire" } },
      partenaire: true,
    },
    orderBy: [{ controleRenforce: "desc" }, { dateDerniereActivite: "desc" }],
  });
  console.log("bureau query OK, dossiers:", d.length);
} catch (e) {
  console.error("bureau still FAIL", e.meta || e.message);
  // find which profil fails
  const ids = await p.$queryRawUnsafe(`SELECT id FROM Profil`);
  for (const { id } of ids) {
    try {
      await p.profil.findUnique({ where: { id } });
    } catch (err) {
      console.error("BAD profil", id, err.meta);
      const cols = await p.$queryRawUnsafe(
        `SELECT CAST(createdAt AS TEXT) as c, CAST(updatedAt AS TEXT) as u FROM Profil WHERE id = ?`,
        id,
      ).catch(() => null);
      console.log(cols);
    }
  }
}

await p.$disconnect();
