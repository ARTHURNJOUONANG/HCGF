import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const demande = await prisma.demande.findFirst({
    include: { offre: { include: { pieces: true } }, documents: true },
    orderBy: { createdAt: "desc" },
  });
  if (!demande) {
    console.log("Aucune demande. Créez-en une comme candidat d’abord.");
    return;
  }

  const dir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(dir, { recursive: true });

  for (const piece of demande.offre.pieces) {
    const already = demande.documents.some((d) => d.idPieceRequise === piece.id);
    if (already) continue;
    const filename = `${demande.reference}-${piece.typePiece}-specimen.pdf`;
    const contenu = `%PDF-1.4\n1 0 obj<<>>endobj\nSpécimen ${piece.libelle} pour ${demande.reference}\n`;
    await writeFile(path.join(dir, filename), contenu, "utf8");
    await prisma.document.create({
      data: {
        idDemande: demande.id,
        idPieceRequise: piece.id,
        type: "transmis",
        nom: `${piece.libelle}.pdf`,
        format: "application/pdf",
        storagePath: filename,
        hash: createHash("sha256").update(contenu).digest("hex"),
        statut: "recu",
        origine: "candidat",
      },
    });
    await prisma.tacheInterne.create({
      data: {
        idDemande: demande.id,
        action: `Contrôler ${piece.libelle}`,
        priorite: "normal",
      },
    });
  }

  await prisma.demande.update({
    where: { id: demande.id },
    data: { statut: "en_traitement", etapeCourante: "documents" },
  });

  console.log("Spécimens déposés sur", demande.reference, demande.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
