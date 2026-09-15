import { PrismaClient } from "../src/generated/prisma";
import { assurerCodeAccesRoles } from "./code-acces";

const prisma = new PrismaClient();

async function main() {
  const resultat = await assurerCodeAccesRoles(prisma);
  if (resultat.cree) {
    console.log("CODE ACCES ROLES (PD + vous uniquement):", resultat.brut);
  } else {
    console.log("Code d’accès rôles déjà en place (non réaffiché).");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
