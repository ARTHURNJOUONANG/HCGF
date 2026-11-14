import { PrismaClient } from "../src/generated/prisma/index.js";
const p = new PrismaClient();
const d = await p.demande.findMany({
  where: { offre: { codeService: "AVI", codePays: "FR" } },
  select: { id: true, reference: true, statut: true },
  orderBy: { createdAt: "desc" },
  take: 8,
});
console.log(JSON.stringify(d, null, 2));
await p.$disconnect();
