import { chargerEnvProd, run, tryGenerateSqlite } from "./charger-env-prod.mjs";

chargerEnvProd();
run("node", ["scripts/prisma-postgres-schema.mjs"]);
run("npx", ["prisma", "generate", "--schema=prisma/schema.postgres.prisma"]);

const { PrismaClient } = await import("../src/generated/prisma/index.js");
const prisma = new PrismaClient();

function groupe(lignes, cle) {
  const map = {};
  for (const ligne of lignes) {
    const k = ligne[cle] || "(vide)";
    map[k] = (map[k] ?? 0) + ligne._count._all;
  }
  return map;
}

try {
  const [
    utilisateurs,
    parType,
    parRole,
    demandes,
    parStatut,
    pays,
    services,
    offres,
    documents,
    partenaires,
    secret,
  ] = await Promise.all([
    prisma.utilisateur.count(),
    prisma.utilisateur.groupBy({ by: ["typeCompte"], _count: { _all: true } }),
    prisma.utilisateur.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.demande.count(),
    prisma.demande.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.pays.count({ where: { actif: true } }),
    prisma.service.count({ where: { actif: true } }),
    prisma.offreService.count({ where: { actif: true } }),
    prisma.document.count(),
    prisma.partenaire.count(),
    prisma.secretInterne.count({ where: { cle: "code_acces_roles" } }),
  ]);

  console.log(
    JSON.stringify(
      {
        base: "postgres",
        comptes: { total: utilisateurs, parType: groupe(parType, "typeCompte"), parRole: groupe(parRole, "role") },
        dossiers: { total: demandes, parStatut: groupe(parStatut, "statut") },
        catalogue: { pays, services, offres },
        pieces: documents,
        partenaires,
        codeAccesRoles: secret > 0,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
  tryGenerateSqlite();
}
