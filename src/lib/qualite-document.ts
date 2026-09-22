import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "./prisma";
import { cheminStockage } from "./fichiers";

/** Limite absurde de sécurité / maintenance : 2,5 Go par document. */
export const TAILLE_MAX_DOCUMENT = Math.floor(2.5 * 1024 * 1024 * 1024);

/** Variance laplacienne sous ce seuil → image considérée floue. */
const SEUIL_FLOU = 90;

const MIME_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

export function messageTailleMax() {
  return "Fichier trop volumineux (2,5 Go max par document).";
}

export async function controlerTailleDepot(octets: number) {
  if (octets > TAILLE_MAX_DOCUMENT) {
    return { error: messageTailleMax() };
  }
  return { ok: true as const };
}

/**
 * Analyse de netteté (laplacien) sur les images.
 * Les PDF ne sont pas scorés ici : refus uniquement si illisibles côté contrôle humain.
 */
export async function controlerNetteDocument(opts: { buffer: Buffer; mime: string }) {
  if (!MIME_IMAGE.has(opts.mime)) {
    return { ok: true as const, flou: false as const, score: null as number | null };
  }

  try {
    const { data, info } = await sharp(opts.buffer)
      .rotate()
      .greyscale()
      .resize(720, 720, { fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    if (w < 32 || h < 32) {
      return {
        error: "Image trop petite pour être contrôlée. Reprenez une photo plus nette et plus large.",
      };
    }

    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = -data[i - w]! - data[i - 1]! + 4 * data[i]! - data[i + 1]! - data[i + w]!;
        sum += lap;
        sumSq += lap * lap;
        n++;
      }
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    if (variance < SEUIL_FLOU) {
      return {
        error:
          "Document trop flou : il est refusé. Reprenez la photo avec une meilleure mise au point, sans bouger.",
        flou: true as const,
        score: variance,
      };
    }
    return { ok: true as const, flou: false as const, score: variance };
  } catch (erreur) {
    console.error("controlerNetteDocument", erreur);
    return { error: "Impossible d’analyser la netteté de cette image. Réessayez avec un JPG ou PNG." };
  }
}

export async function tailleFichierStocke(storagePath: string) {
  const fichier = cheminStockage(storagePath);
  if (!fichier) return 0;
  try {
    const info = await stat(fichier);
    return info.size;
  } catch {
    return 0;
  }
}

/** Purge / signalement des fichiers > 2,5 Go (maintenance BD + disque). */
export async function maintenirTailleDocuments() {
  const docs = await prisma.document.findMany({
    where: { type: "transmis" },
    select: { id: true, storagePath: true, nom: true, idDemande: true },
  });

  let excessifs = 0;
  let octetsLibres = 0;
  let octetsTotal = 0;

  for (const doc of docs) {
    const taille = await tailleFichierStocke(doc.storagePath);
    octetsTotal += taille;
    if (taille <= TAILLE_MAX_DOCUMENT) continue;

    excessifs++;
    octetsLibres += taille;
    const fichier = cheminStockage(doc.storagePath);
    if (fichier) {
      try {
        await unlink(fichier);
      } catch {
        /* ignore */
      }
    }
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        statut: "a_remplacer",
        ocrStatut: "refuse_taille",
        ocrJson: JSON.stringify({
          motif: "taille_max_2_5_go",
          octets: taille,
        }),
      },
    });
    await prisma.journalAudit.create({
      data: {
        idActeur: null,
        action: "document_refuse_taille",
        objetType: "document",
        objetId: doc.id,
        idDemande: doc.idDemande,
        detail: `${doc.nom} · ${taille} octets > 2,5 Go — fichier retiré`,
      },
    });
    await prisma.tacheInterne.create({
      data: {
        idDemande: doc.idDemande,
        action: `Redemander la pièce « ${doc.nom} » (fichier > 2,5 Go retiré)`,
        priorite: "haute",
      },
    });
  }

  // Orphelins disque non référencés
  let orphelins = 0;
  try {
    const dir = path.join(process.cwd(), "storage", "uploads");
    const noms = await readdir(dir);
    const connus = new Set(docs.map((d) => path.basename(d.storagePath.replaceAll("\\", "/"))));
    for (const nom of noms) {
      if (connus.has(nom)) continue;
      const full = path.join(dir, nom);
      try {
        const info = await stat(full);
        if (info.isFile() && info.size > TAILLE_MAX_DOCUMENT) {
          await unlink(full);
          orphelins++;
          octetsLibres += info.size;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* pas de dossier uploads */
  }

  return {
    documentsScannes: docs.length,
    excessifs,
    orphelins,
    octetsTotal,
    octetsLibres,
    plafondOctets: TAILLE_MAX_DOCUMENT,
  };
}
