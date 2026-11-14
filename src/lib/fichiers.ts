import path from "path";
import { mkdir, readFile, stat, writeFile, unlink } from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export function nomStockageSur(storagePath: string) {
  const base = path.basename(storagePath.replaceAll("\\", "/"));
  if (!base || base === "." || base === ".." || base.includes("..") || /[/\\]/.test(base)) {
    return null;
  }
  return base;
}

export function cheminStockage(storagePath: string) {
  const nom = nomStockageSur(storagePath);
  if (!nom) return null;
  return path.join(UPLOAD_DIR, nom);
}

export function detecterFormat(buffer: Buffer) {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mime: "application/pdf", ext: ".pdf" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: ".png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }
  return null;
}

export function dispositionFichier(nom: string, inline = true) {
  const propre = nom.replace(/[\r\n\\"]/g, "_").slice(0, 180) || "fichier";
  return `${inline ? "inline" : "attachment"}; filename="${propre}"`;
}

export function entetesFichier(mime: string, nom?: string) {
  return {
    "Content-Type": mime || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    ...(nom ? { "Content-Disposition": dispositionFichier(nom) } : {}),
  };
}

/**
 * Stockage des pièces : disque local (dev / Docker) ou Vercel Blob privé
 * dès que BLOB_READ_WRITE_TOKEN est défini (le disque Vercel est éphémère).
 */
export function modeStockage(): "disque" | "blob" {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() ? "blob" : "disque";
}

const PREFIXE_BLOB = "uploads/";

async function blob() {
  return import("@vercel/blob");
}

export async function ecrireStockage(storagePath: string, data: Buffer | string) {
  const nom = nomStockageSur(storagePath);
  if (!nom) throw new Error("Nom de fichier invalide.");
  if (modeStockage() === "blob") {
    const { put } = await blob();
    await put(`${PREFIXE_BLOB}${nom}`, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return nom;
  }
  if (process.env.VERCEL) {
    throw new Error("Stockage : BLOB_READ_WRITE_TOKEN est requis sur Vercel (disque éphémère).");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, nom), data);
  return nom;
}

export async function lireStockage(storagePath: string) {
  const nom = nomStockageSur(storagePath);
  if (!nom) return null;
  try {
    if (modeStockage() === "blob") {
      const { get } = await blob();
      const resultat = await get(`${PREFIXE_BLOB}${nom}`, { access: "private" });
      if (!resultat || resultat.statusCode !== 200) return null;
      return Buffer.from(await new Response(resultat.stream).arrayBuffer());
    }
    return await readFile(path.join(UPLOAD_DIR, nom));
  } catch {
    return null;
  }
}

export async function tailleStockage(storagePath: string) {
  const nom = nomStockageSur(storagePath);
  if (!nom) return 0;
  try {
    if (modeStockage() === "blob") {
      const { head } = await blob();
      return (await head(`${PREFIXE_BLOB}${nom}`)).size;
    }
    return (await stat(path.join(UPLOAD_DIR, nom))).size;
  } catch {
    return 0;
  }
}

export async function supprimerStockage(storagePath: string) {
  const nom = nomStockageSur(storagePath);
  if (!nom) return false;
  try {
    if (modeStockage() === "blob") {
      const { del } = await blob();
      await del(`${PREFIXE_BLOB}${nom}`);
      return true;
    }
    await unlink(path.join(UPLOAD_DIR, nom));
    return true;
  } catch {
    return false;
  }
}
