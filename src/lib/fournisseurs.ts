import { prisma } from "./prisma";

const FOURNISSEURS: { code: string; libelle: string }[] = [
  { code: "duffel", libelle: "Duffel (vols)" },
  { code: "paypal", libelle: "PayPal" },
  { code: "orange_money", libelle: "Orange Money" },
  { code: "mtn_money", libelle: "MTN Money" },
  { code: "wero", libelle: "Wero" },
  { code: "assureur", libelle: "Assureur" },
  { code: "maps", libelle: "Cartes / trajets" },
  { code: "esign", libelle: "Signature électronique" },
  { code: "ocr", libelle: "OCR pièces" },
  { code: "ia", libelle: "IA métier" },
];

export function masquerSecrets(texte: string) {
  return texte
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/sk_(live|test)_[A-Za-z0-9]+/g, "sk_***")
    .replace(/whsec_[A-Za-z0-9]+/g, "whsec_***")
    .replace(/re_[A-Za-z0-9]+/g, "re_***");
}

export async function assurerFournisseurs() {
  for (const f of FOURNISSEURS) {
    await prisma.fournisseurExterne.upsert({
      where: { code: f.code },
      update: { libelle: f.libelle },
      create: f,
    });
  }
}

export type ResultatAppel<T> =
  | { ok: true; data: T; codeHttp?: number; reponse?: string }
  | { ok: false; indisponible?: boolean; erreur: string; codeHttp?: number; reponse?: string };

export async function executerOperationApi<T>(opts: {
  codeFournisseur: string;
  action: string;
  cleIdempotence: string;
  idDemande?: string | null;
  appeler: () => Promise<ResultatAppel<T>>;
}): Promise<{ ok: true; data: T; deja?: boolean } | { ok: false; error: string; statut: string }> {
  await assurerFournisseurs();

  const existante = await prisma.operationApi.findUnique({
    where: { cleIdempotence: opts.cleIdempotence },
  });
  if (existante?.statut === "ok") {
    try {
      return { ok: true, data: JSON.parse(existante.payloadJson) as T, deja: true };
    } catch {
      return { ok: true, data: {} as T, deja: true };
    }
  }

  const operation =
    existante ??
    (await prisma.operationApi.create({
      data: {
        codeFournisseur: opts.codeFournisseur,
        action: opts.action,
        cleIdempotence: opts.cleIdempotence,
        idDemande: opts.idDemande ?? null,
        statut: "en_cours",
      },
    }));

  let resultat: ResultatAppel<T>;
  try {
    resultat = await opts.appeler();
  } catch (erreur) {
    resultat = {
      ok: false,
      indisponible: true,
      erreur: erreur instanceof Error ? erreur.message : "Service externe indisponible",
    };
  }

  const reponse = masquerSecrets((resultat.ok ? resultat.reponse : resultat.reponse) ?? (resultat.ok ? "" : resultat.erreur));
  await prisma.tentativeApi.create({
    data: {
      idOperation: operation.id,
      codeHttp: resultat.codeHttp ?? (resultat.ok ? 200 : 0),
      reponse: reponse.slice(0, 2000),
    },
  });

  if (resultat.ok) {
    await prisma.operationApi.update({
      where: { id: operation.id },
      data: {
        statut: "ok",
        nbTentatives: { increment: 1 },
        derniereErreur: "",
        payloadJson: JSON.stringify(resultat.data),
      },
    });
    return { ok: true, data: resultat.data, deja: false };
  }

  const statut = resultat.indisponible ? "service_indisponible" : "echec";
  await prisma.operationApi.update({
    where: { id: operation.id },
    data: {
      statut,
      nbTentatives: { increment: 1 },
      derniereErreur: resultat.erreur.slice(0, 500),
    },
  });
  return { ok: false, error: resultat.erreur, statut };
}

export async function rejouerOperationsIndisponibles(limite = 20) {
  await assurerFournisseurs();
  const file = await prisma.operationApi.findMany({
    where: { statut: "service_indisponible" },
    orderBy: { updatedAt: "asc" },
    take: limite,
  });
  return { enAttente: file.length, ids: file.map((o) => o.id) };
}
