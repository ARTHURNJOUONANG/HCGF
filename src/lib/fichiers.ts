import path from "path";
import { mkdir, readFile, writeFile, unlink } from "fs/promises";

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

export async function ecrireStockage(storagePath: string, data: Buffer | string) {
  const fichier = cheminStockage(storagePath);
  if (!fichier) throw new Error("Nom de fichier invalide.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(fichier, data);
  return path.basename(fichier);
}

export async function lireStockage(storagePath: string) {
  const fichier = cheminStockage(storagePath);
  if (!fichier) return null;
  try {
    return await readFile(fichier);
  } catch {
    return null;
  }
}

export async function supprimerStockage(storagePath: string) {
  const fichier = cheminStockage(storagePath);
  if (!fichier) return false;
  try {
    await unlink(fichier);
    return true;
  } catch {
    return false;
  }
}
