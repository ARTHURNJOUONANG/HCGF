import { PrismaClient } from "../src/generated/prisma/index.js";
const p = new PrismaClient();
const d = await p.document.findFirst({
  where: { idDemande: "cmvlb4w9o000cts4o2u6mvybs", type: "genere" },
});
console.log(d);
await p.$disconnect();
