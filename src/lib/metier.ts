import type { ChampFormulaire, ItemChecklist, ReponseFormulaire } from "@/generated/prisma";

export const STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  en_traitement: "En traitement",
  validee: "Validée",
  cloturee: "Clôturée",
  annulee: "Annulée",
  abandonnee: "Abandonnée",
};

export const SERVICES: Record<string, string> = {
  AVI: "AVI",
  ASSURANCE: "Assurance",
  HEBERGEMENT: "Hébergement",
  VOL: "Vol",
};

export function champVisible(
  champ: ChampFormulaire,
  valeurs: Record<string, string>,
) {
  if (!champ.conditionChamp) return true;
  const actuel = valeurs[champ.conditionChamp] ?? "";
  if (champ.conditionOp === "eq") {
    return actuel === (champ.conditionValeur ?? "");
  }
  return true;
}

export function calculerAvancement(
  champs: ChampFormulaire[],
  valeurs: Record<string, string>,
) {
  const visibles = champs.filter((c) => champVisible(c, valeurs) && c.obligatoire);
  if (visibles.length === 0) return 0;
  const remplis = visibles.filter((c) => (valeurs[c.code] ?? "").trim().length > 0);
  return Math.round((remplis.length / visibles.length) * 100);
}

export function checklistDepuisAvancement(
  items: ItemChecklist[],
  avancement: number,
) {
  return items.map((item) => {
    if (item.libelle.toLowerCase().includes("personnel") || item.libelle.toLowerCase().includes("information")) {
      return { ...item, statut: avancement >= 40 ? "termine" : avancement > 0 ? "en_attente" : "a_venir" };
    }
    if (item.libelle.toLowerCase().includes("document") || item.libelle.toLowerCase().includes("passeport")) {
      return { ...item, statut: avancement >= 80 ? "en_attente" : "a_venir" };
    }
    return item;
  });
}

export function reponsesVersMap(reponses: (ReponseFormulaire & { champ: ChampFormulaire })[]) {
  const map: Record<string, string> = {};
  for (const r of reponses) {
    map[r.champ.code] = r.valeur;
  }
  return map;
}

export function prefixeReference(service: string, pays: string) {
  if (service === "AVI") return `AVI-${pays}`;
  if (service === "ASSURANCE") return "ASS";
  if (service === "HEBERGEMENT") return `HEB-${pays}`;
  if (service === "VOL") return "VOL";
  return service;
}
