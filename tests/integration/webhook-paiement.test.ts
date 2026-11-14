import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { assurerEspaceFinancier, confirmerPaiementExterne } = await import("@/lib/lot3");

let candidatId = "";
let offreId = "";

async function nouveauDossierEnAttente(cle: string) {
  const demande = await prisma.demande.create({
    data: { reference: `TEST-${cle}`, idUtilisateur: candidatId, idOffre: offreId },
  });
  const espace = await assurerEspaceFinancier(demande.id);
  if (!espace) throw new Error("espace financier");
  const montant = espace.montantAttendu - espace.montantRecu;
  await prisma.operationFinanciere.create({
    data: {
      idEspace: demande.id,
      type: "paiement",
      montant,
      reference: demande.reference,
      idTransaction: `ORDER-${cle}`,
      cleIdempotence: cle,
      source: "paypal",
      statut: "en_attente",
    },
  });
  return { demandeId: demande.id, montant };
}

function notification(demandeId: string, cle: string, montant: number, source = "paypal") {
  return confirmerPaiementExterne({
    demandeId,
    transaction: `CAPTURE-${cle}`,
    montant,
    cleIdempotence: cle,
    source,
    moyen: "PayPal",
  });
}

async function montantRecu(demandeId: string) {
  return (await prisma.espaceFinancier.findUniqueOrThrow({ where: { idDemande: demandeId } })).montantRecu;
}

beforeAll(async () => {
  const candidat = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "candidat.demo@avi.test" } });
  const offre = await prisma.offreService.findFirstOrThrow({ where: { codePays: "FR", codeService: "AVI" } });
  candidatId = candidat.id;
  offreId = offre.id;
});

describe("confirmation d’un paiement par webhook", () => {
  it("refuse un paiement qui n’a pas été ouvert par le serveur", async () => {
    const { demandeId, montant } = await nouveauDossierEnAttente("inconnu-base");
    const r = await notification(demandeId, "cle-inventee", montant);
    expect(r).toHaveProperty("error");
    expect(await montantRecu(demandeId)).toBe(0);
  });

  it("refuse un montant différent du montant attendu", async () => {
    const { demandeId, montant } = await nouveauDossierEnAttente("montant");
    const r = await notification(demandeId, "montant", montant - 1);
    expect(r).toMatchObject({ error: expect.stringContaining("montant") });
    expect(await montantRecu(demandeId)).toBe(0);
  });

  it("refuse un autre moyen de paiement que celui ouvert", async () => {
    const { demandeId, montant } = await nouveauDossierEnAttente("moyen");
    const r = await notification(demandeId, "moyen", montant, "orange_money");
    expect(r).toHaveProperty("error");
  });

  it("refuse une clé rattachée à un autre dossier", async () => {
    const a = await nouveauDossierEnAttente("dossier-a");
    const b = await nouveauDossierEnAttente("dossier-b");
    const r = await notification(b.demandeId, "dossier-a", a.montant);
    expect(r).toHaveProperty("error");
    expect(await montantRecu(b.demandeId)).toBe(0);
  });

  it("encaisse un paiement conforme et solde le dossier", async () => {
    const { demandeId, montant } = await nouveauDossierEnAttente("conforme");
    const r = await notification(demandeId, "conforme", montant);
    expect(r).not.toHaveProperty("error");
    const espace = await prisma.espaceFinancier.findUniqueOrThrow({ where: { idDemande: demandeId } });
    expect(espace.montantRecu).toBe(montant);
    expect(espace.statutFonds).toBe("fonds_recus");
  });

  it("ne compte qu’une fois un webhook rejoué ou reçu en double simultanément", async () => {
    const { demandeId, montant } = await nouveauDossierEnAttente("double");
    await Promise.all([notification(demandeId, "double", montant), notification(demandeId, "double", montant)]);
    await notification(demandeId, "double", montant);
    expect(await montantRecu(demandeId)).toBe(montant);
  });
});
