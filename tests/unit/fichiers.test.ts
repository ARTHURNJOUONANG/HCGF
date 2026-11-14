import { describe, expect, it } from "vitest";
import { detecterFormat, dispositionFichier, nomStockageSur } from "@/lib/fichiers";

describe("nomStockageSur", () => {
  it("garde un nom de fichier simple", () => {
    expect(nomStockageSur("piece-123.pdf")).toBe("piece-123.pdf");
    expect(nomStockageSur("storage/uploads/piece-123.pdf")).toBe("piece-123.pdf");
  });
  it.each(["", ".", "..", "../", "a..b"])("refuse %j", (nom) => {
    expect(nomStockageSur(nom)).toBeNull();
  });
  it("neutralise une traversée de répertoire", () => {
    expect(nomStockageSur("../../etc/passwd")).toBe("passwd");
    expect(nomStockageSur("..\\..\\windows\\win.ini")).toBe("win.ini");
  });
});

describe("detecterFormat", () => {
  it("reconnaît PDF, JPEG, PNG et WebP par leur signature", () => {
    expect(detecterFormat(Buffer.from("%PDF-1.7"))?.mime).toBe("application/pdf");
    expect(detecterFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detecterFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(detecterFormat(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))?.mime).toBe("image/webp");
  });
  it("refuse un exécutable déguisé", () => {
    expect(detecterFormat(Buffer.from("MZ\x90\0fake.pdf"))).toBeNull();
    expect(detecterFormat(Buffer.from("<html>"))).toBeNull();
  });
});

describe("dispositionFichier", () => {
  it("empêche l’injection d’en-têtes", () => {
    expect(dispositionFichier('a"\r\nSet-Cookie: x')).not.toMatch(/[\r\n"]Set/);
  });
});
