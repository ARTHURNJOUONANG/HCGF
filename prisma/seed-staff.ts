import { PrismaClient } from "../src/generated/prisma";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function upsertStaff(
  email: string,
  role: string,
  nom: string,
  prenom: string,
) {
  const motDePasseHash = await hash("Demo2026!", 10);
  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) {
    await prisma.utilisateur.update({
      where: { email },
      data: { typeCompte: "collaborateur", role, motDePasseHash },
    });
    return;
  }
  await prisma.utilisateur.create({
    data: {
      email,
      motDePasseHash,
      typeCompte: "collaborateur",
      role,
      profil: { create: { nom, prenom } },
    },
  });
}

async function main() {
  await upsertStaff("conseiller.demo@avi.test", "conseiller", "Martin", "Claire");
  await upsertStaff("signataire.demo@avi.test", "signataire", "Morel", "Julien");

  let partenaire = await prisma.partenaire.findFirst({ where: { nom: "Campus Horizon" } });
  if (!partenaire) {
    partenaire = await prisma.partenaire.create({
      data: { nom: "Campus Horizon", type: "agence", statut: "actif" },
    });
    await prisma.regleCommission.create({
      data: { idPartenaire: partenaire.id, taux: 12, montantFixe: 0, dateDebut: "2026-01-01" },
    });
  }
  const motDePasseHash = await hash("Demo2026!", 10);
  const agent = await prisma.utilisateur.findUnique({ where: { email: "partenaire.demo@avi.test" } });
  if (agent) {
    await prisma.utilisateur.update({
      where: { email: "partenaire.demo@avi.test" },
      data: { typeCompte: "partenaire", role: "apporteur", motDePasseHash, idPartenaire: partenaire.id },
    });
  } else {
    await prisma.utilisateur.create({
      data: {
        email: "partenaire.demo@avi.test",
        motDePasseHash,
        typeCompte: "partenaire",
        role: "apporteur",
        idPartenaire: partenaire.id,
        profil: { create: { nom: "Fall", prenom: "Karim" } },
      },
    });
  }
  console.log("Comptes équipe et partenaire prêts.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
