import { PrismaClient } from "../src/generated/prisma/index.js";
const p = new PrismaClient();
const d = await p.demande.findMany({
  include: {
    offre: true,
    espaceFinancier: true,
    documents: true,
    utilisateur: true,
  },
  orderBy: { dateDerniereActivite: "desc" },
  take: 20,
});
console.log(
  JSON.stringify(
    d.map((x) => ({
      id: x.id,
      ref: x.reference,
      statut: x.statut,
      etape: x.etapeCourante,
      svc: x.offre.codeService,
      pays: x.offre.codePays,
      fonds: x.espaceFinancier?.statutFonds,
      docs: x.documents.map((doc) => ({ type: doc.type, statut: doc.statut })),
      email: x.utilisateur.email,
    })),
    null,
    2,
  ),
);
await p.$disconnect();
