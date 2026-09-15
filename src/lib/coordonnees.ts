export function coordonneesPubliques() {
  const email = process.env.CONTACT_EMAIL?.trim() ?? "";
  const tel = process.env.CONTACT_TEL?.trim() ?? "";
  const adresse = process.env.CONTACT_ADRESSE?.trim() ?? "";
  const telHref = tel ? `tel:${tel.replace(/[^\d+]/g, "")}` : "";
  return { email, tel, telHref, adresse };
}

export function ibanPlateforme() {
  return process.env.IBAN_PLATEFORME?.trim() ?? "";
}
