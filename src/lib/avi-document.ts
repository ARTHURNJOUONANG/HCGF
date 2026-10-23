import { randomBytes, randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import QRCode from "qrcode";
import { ibanPlateforme } from "./coordonnees";
import { hashBuffer } from "./ocr";
import { origine } from "./origine";

const MARQUE = "HORIZON CAUTION & GARANTIE FINANCIÈRE";
const SIGLE = "HCGF";
const PRESIDENTE = "Madame Octavia MBIAKOUP KONGUEP";
const ORIAS = "26006261";
const RCS = "102 527 371";
const SIREN = "102 527 371";
const CAPITAL = "10 000";
const ADRESSE = "50 avenue des Champs-Élysées, 75008 Paris";
const EMAIL = "contact@hcgf.fr";
const TEL = "+33 7 45 90 21 08";
const GARANT = "MARKEL INSURANCE SE";
const REF_GARANTIE = "RK0003784";
const PARTENAIRE_NL = "Airwallex (Netherlands) B.V.";
const PARTENAIRE_DE = "Airwallex (Germany) B.V.";
const IBAN_NL = "NL28AINH2252021667";
const IBAN_DE_DEFAUT = "DE11202208000047898863";
const BIC_DE_DEFAUT = "SXPYDEHH";
const EMPREINTE = "[[[EMPREINTE]]]";

type Reponse = { valeur: string; champ: { code: string; libelle: string } };
type Piece = { nom: string; statut: string; type: string; piece?: { libelle: string } | null };

export type DossierAttestation = {
  reference: string;
  reponses: Reponse[];
  documents: Piece[];
  offre: { codePays: string; codeService: string; service: { libelle: string }; pays: { libelle: string } };
  utilisateur: {
    email: string;
    profil?: { nom?: string | null; prenom?: string | null; dateNaissance?: string | null; telephone?: string | null; adresse?: string | null } | null;
  };
  espaceFinancier?: {
    montantRecu: number;
    montantAttendu: number;
    devise: string;
    operations?: { type: string; createdAt: Date }[];
  } | null;
};

export function nouveauCodeVerification() {
  const brut = randomBytes(6).toString("hex").toUpperCase();
  return `${brut.slice(0, 4)}-${brut.slice(4, 8)}-${brut.slice(8, 12)}`;
}

function champ(map: Record<string, string>, code: string) {
  return (map[code] ?? "").trim();
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mark(s: string) {
  return `<mark>${esc(s)}</mark>`;
}

function urlVerificationPublique(urlVerif: string) {
  try {
    const u = new URL(urlVerif);
    return `${u.host}/verifier`;
  } catch {
    return urlVerif.replace(/^https?:\/\//, "").replace(/\/verifier\/.*$/, "/verifier");
  }
}

function logoSrc() {
  try {
    const fichier = path.join(process.cwd(), "public", "hcgf", "logo.png");
    return `data:image/png;base64,${readFileSync(fichier).toString("base64")}`;
  } catch {
    return "/hcgf/logo.png";
  }
}

function parseDate(valeur: string) {
  if (!valeur) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valeur);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(valeur);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtFr(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function fmtDe(d: Date) {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function fmtEn(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "long", year: "numeric" }).format(d);
}

function enLettresEn(n: number) {
  const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const under100 = (x: number) => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const u = x % 10;
    return tens[t] + (u ? `-${ones[u]}` : "");
  };
  const under1000 = (x: number) => {
    if (x < 100) return under100(x);
    const c = Math.floor(x / 100);
    const r = x % 100;
    return `${ones[c]} hundred${r ? ` ${under100(r)}` : ""}`;
  };
  const entier = Math.floor(Math.abs(n));
  if (entier < 1000) return under1000(entier);
  const k = Math.floor(entier / 1000);
  const r = entier % 1000;
  return `${under1000(k)} thousand${r ? ` ${under1000(r)}` : ""}`;
}

function fmtHeure(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d).replace(",", "");
}

function anneeAcademique(rentree: Date | null, emission: Date) {
  const base = rentree ?? emission;
  const y = base.getMonth() >= 8 ? base.getFullYear() : base.getFullYear() - 1;
  return { debut: y, fin: y + 1, libelle: `${y}-${y + 1}` };
}

function finValidite(rentree: Date | null, emission: Date, dureeMois: number) {
  if (rentree) {
    const { fin } = anneeAcademique(rentree, emission);
    return new Date(fin, 8, 15);
  }
  const v = new Date(emission);
  v.setMonth(v.getMonth() + (dureeMois || 12));
  return v;
}

function montantEuros(map: Record<string, string>, finance?: DossierAttestation["espaceFinancier"]) {
  const brut = champ(map, "montant_avi").replace(",", ".");
  const saisi = Number(brut);
  if (Number.isFinite(saisi) && saisi > 0) return saisi > 50000 ? saisi / 100 : saisi;
  if (finance?.montantRecu) return finance.montantRecu / 100;
  if (finance?.montantAttendu) return finance.montantAttendu / 100;
  return 0;
}

const UNITES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];

function dizaine(n: number): string {
  if (n < 17) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  const noms = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  if (d === 7 || d === 9) {
    const base = d === 7 ? "soixante" : "quatre-vingt";
    const reste = 10 + u;
    if (u === 1 && d === 7) return `${base} et onze`;
    return `${base}-${dizaine(reste)}`;
  }
  if (d === 8 && u === 0) return "quatre-vingts";
  if (u === 0) return noms[d];
  if (u === 1 && d !== 8) return `${noms[d]} et un`;
  return `${noms[d]}-${UNITES[u]}`;
}

function centaines(n: number): string {
  if (n < 100) return dizaine(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const tete = c === 1 ? "cent" : `${UNITES[c]} cent${r === 0 ? "s" : ""}`;
  return r ? `${tete} ${dizaine(r)}` : tete;
}

function enLettres(n: number) {
  const entier = Math.floor(Math.abs(n));
  if (entier === 0) return "zéro";
  if (entier < 1000) return centaines(entier);
  const mille = Math.floor(entier / 1000);
  const reste = entier % 1000;
  const tete = mille === 1 ? "mille" : `${centaines(mille)} mille`;
  return reste ? `${tete} ${centaines(reste)}` : tete;
}

function sommeLettres(montant: number, devise: string) {
  const lettres = enLettres(montant);
  if (devise === "CAD") return `${lettres} dollars canadiens`;
  return `${lettres} euros`;
}

function fmtMontant(n: number, devise: string) {
  const texte = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  if (devise === "CAD") return `${texte} CAD`;
  return `${texte} €`;
}

function fmtMontantDe(n: number) {
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function ibanAffiche(pays: string) {
  const env = ibanPlateforme();
  if (env) return env.replace(/(.{4})/g, "$1 ").trim();
  const brut = pays === "DE" ? IBAN_DE_DEFAUT : IBAN_NL;
  return brut.replace(/(.{4})/g, "$1 ").trim();
}

function bicAffiche() {
  return process.env.BIC_PLATEFORME?.trim() || BIC_DE_DEFAUT;
}

function partenaire(pays: string) {
  if (pays === "DE") return process.env.PARTENAIRE_BANQUE?.trim() || PARTENAIRE_DE;
  return process.env.PARTENAIRE_BANQUE?.trim() || PARTENAIRE_NL;
}

function nomComplet(map: Record<string, string>, dossier: DossierAttestation) {
  const nom = champ(map, "nom") || dossier.utilisateur.profil?.nom || "";
  const prenom = champ(map, "prenom") || dossier.utilisateur.profil?.prenom || "";
  return `${nom} ${prenom}`.trim() || dossier.utilisateur.email;
}

async function qrSvg(url: string, taille = 108) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: taille,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#ffffff" },
  });
}

function cssCommun() {
  return `
    :root { color-scheme: only light; }
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #ececec; color: #111; font: 11pt/1.45 "Calibri", "Segoe UI", Arial, sans-serif; }
    mark { background: #fff59d; color: #111; padding: 0 1px; }
    .page { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 14mm 16mm 16mm; background: #fff; color: #111; box-shadow: 0 2px 14px rgba(0,0,0,.12); }
    img.logo { height: 52px; width: auto; display: block; }
    table.grid { width: 100%; border-collapse: collapse; }
    table.grid th, table.grid td { border: 1px solid #222; vertical-align: top; }
    .muted { color: #444; }
    .foot { margin-top: 18px; font-size: 7.2pt; line-height: 1.35; color: #555; text-align: justify; }
    .foot .partner { color: #2e7d32; }
    h1 { margin: 0; }
    @media print {
      html, body { background: #fff; }
      .page { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 0; }
      .page-break { page-break-before: always; }
    }
  `;
}

function enTeteFr() {
  return `
  <table class="grid" style="border:0">
    <tr>
      <td style="border:0;width:28%;padding:0 8px 8px 0;vertical-align:middle"><img class="logo" src="${logoSrc()}" alt="HCGF"></td>
      <td style="border:0;width:36%;padding:4px 10px;font-size:9pt;line-height:1.45;border-left:1px solid #ccc;border-right:1px solid #ccc">
        ${esc(ADRESSE)}<br>Tél : ${esc(RCS)}<br>
        <span class="muted">RCS Paris : ${esc(RCS)}</span>
      </td>
      <td style="border:0;width:36%;padding:4px 10px;font-size:9pt;line-height:1.45">
        <strong>N° ORIAS :</strong> ${esc(ORIAS)}<br>
        Email : ${esc(EMAIL)}<br>
        Tél : ${esc(TEL)}
      </td>
    </tr>
  </table>`;
}

function enTeteBe() {
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <tr>
      <td style="width:24%;padding:0 8px 0 0;vertical-align:middle"><img class="logo" src="${logoSrc()}" alt="HCGF"></td>
      <td style="width:16%;font-size:7.5pt;color:#666;line-height:1.35;padding:0 10px;border-left:1px solid #bfbfbf;border-right:1px solid #bfbfbf;vertical-align:middle">
        50 avenue des<br>Champs-Élysées<br>75008 Paris<br>RCS Paris : ${esc(RCS)}
      </td>
      <td style="font-size:9.2pt;padding:0 0 0 12px;line-height:1.45;vertical-align:middle;letter-spacing:.01em">
        <strong style="letter-spacing:.04em">${esc(MARQUE)}</strong><br>
        ${esc(ADRESSE)}<br>
        ${esc(EMAIL)} · ${esc(TEL)}<br>
        RCS Paris : ${esc(RCS)} · ORIAS : ${esc(ORIAS)}
      </td>
    </tr>
  </table>`;
}

function htmlFr(p: {
  dossier: DossierAttestation;
  map: Record<string, string>;
  pays: string;
  code: string;
  qr: string;
  urlVerif: string;
  emission: Date;
  signataire: string;
}) {
  const { map, dossier, pays, code, qr, emission } = p;
  const nom = nomComplet(map, dossier);
  const naissance = parseDate(champ(map, "date_naissance") || dossier.utilisateur.profil?.dateNaissance || "");
  const rentree = parseDate(champ(map, "date_rentree"));
  const duree = Number(champ(map, "duree_mois") || 12) || 12;
  const academique = anneeAcademique(rentree, emission);
  const validite = finValidite(rentree, emission, duree);
  const montant = montantEuros(map, dossier.espaceFinancier);
  const mensuel = montant / (duree || 12);
  const etablissement = champ(map, "etablissement") || "—";
  const devise = pays === "CA" ? "CAD" : "EUR";
  const paysEtude =
    pays === "CA"
      ? "au Canada"
      : pays === "BE"
        ? "en Belgique"
        : pays === "IT"
          ? "en Italie"
          : "en France";
  const prefixe =
    pays === "CA" ? "HCGF-CA" : pays === "BE" ? "HCGF-BE" : pays === "IT" ? "HCGF-IT" : "HCGF-APCF";
  const reference = dossier.reference.startsWith("AVI") ? dossier.reference.replace(/^AVI-/, `${prefixe}-`) : `${prefixe}-${dossier.reference}`;
  const iban = ibanAffiche(pays);
  const banque = partenaire(pays);
  const naissanceTxt = naissance ? fmtFr(naissance) : "—";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(reference)}</title>
<style>${cssCommun()}
  .banner { background:#1d4fbf; color:#fff; text-align:center; font-weight:700; letter-spacing:.22em; font-size:11.5pt; padding:8px 6px; margin:0; white-space:nowrap; }
  .ref { text-align:center; font-size:10pt; margin:8px 0 12px; }
  .corps { text-align:justify; font-size:11pt; }
  .sign { text-align:right; margin-top:22px; }
  .qrbox svg { width:92px; height:92px; display:block; }
</style></head><body><div class="page">
  ${enTeteFr()}
  <table class="grid" style="margin-top:6px">
    <tr>
      <td style="width:18%;padding:8px" class="qrbox">${qr}</td>
      <td style="width:42%;padding:10px 12px;font-size:10pt">
        Scannez ce QR code ou consultez<br>
        <strong>${esc(urlVerificationPublique(p.urlVerif))}</strong>
        afin de vérifier l’authenticité du document.<br><br>
        <strong>Code de vérification : ${esc(code)}</strong>
      </td>
      <td style="width:40%;padding:10px 12px;font-size:10.5pt">
        Nom et Prénom : <strong>${esc(nom)}</strong><br><br>
        Date de fin de validité : <strong>${fmtFr(validite)}</strong>
      </td>
    </tr>
    <tr><td colspan="3" class="banner">ATTESTATION DE VIREMENT IRRÉVOCABLE</td></tr>
  </table>
  <p class="ref">AVI N° ${esc(reference)}</p>
  <div class="corps">
    <p>Nous soussignés, <strong>${esc(MARQUE)} (${esc(SIGLE)})</strong>, société par actions simplifiée à associé unique au capital de ${esc(CAPITAL)} EUR euros, dont le siège social est situé ${esc(ADRESSE)}, immatriculée au RCS de Paris sous le numéro SIREN ${esc(SIREN)}, immatriculée à l’ORIAS sous le n° ${esc(ORIAS)} et bénéficiant d’une garantie financière délivrée par ${mark(GARANT)} sous la référence n° ${mark(REF_GARANTIE)}.</p>
    <p>Représentée par ${esc(PRESIDENTE)}, Présidente dûment habilitée aux présentes,</p>
    <p>Attestons avoir reçue et bloquée sur le compte de paiement n° <strong>${esc(iban.replace(/\s/g, ""))}</strong>, ouvert dans les livres de notre partenaire <strong>${esc(banque)}</strong>, établissement de monnaie électronique réglementé en Europe, la somme de ${mark(`${sommeLettres(montant, devise)} (${fmtMontant(montant, devise)})`)}, au nom et en faveur de ${mark(nom)}, né(e) le ${mark(naissanceTxt)}, en vue de la poursuite de ses études ${esc(paysEtude)} au titre de l’année académique ${mark(academique.libelle)} au sein de ${mark(etablissement)}.</p>
    <p>Ces fonds sont conservés conformément à la réglementation applicable aux établissements de paiement. Les justificatifs correspondants, notamment la preuve de dépôt, le relevé de compte et les documents d’identification, sont annexés à la présente attestation.</p>
    <p>Nous nous engageons à verser mensuellement au bénéficiaire la somme de ${mark(`${sommeLettres(Math.round(mensuel), devise)} (${fmtMontant(Math.round(mensuel * 100) / 100, devise)})`)} pendant une durée de ${mark(`${enLettres(duree)} (${duree}) mois`)}, sur un compte bancaire ouvert à son nom à son arrivée ${esc(paysEtude)}.</p>
    <p>La présente attestation est valable jusqu’au <strong>${fmtFr(validite)}</strong>. Passée cette date, elle deviendra automatiquement caduque, sauf renouvellement exprès.</p>
    <p>En foi de quoi, la présente attestation est établie pour servir et valoir ce que de droit.</p>
  </div>
  <div class="sign">
    <p>Fait à Paris, le ${fmtFr(emission)}</p>
    <p><strong>${esc(PRESIDENTE)} - Présidente</strong></p>
  </div>
  <div class="foot">
    HORIZON CAUTION &amp; GARANTIE FINANCIÈRE est une société de courtage financier régie par le Code monétaire et financier français, immatriculée au registre des intermédiaires en opérations de banque et en services de paiement sous le n° ${esc(ORIAS)} (peut être consulté sur le site de l’Orias, www.orias.fr), bénéficiant d’une assurance responsabilité civile professionnelle et d’une garantie financière en vigueur, toutes deux délivrées par ${esc(GARANT)} sous la police n° ${esc(REF_GARANTIE)}, en application des articles L.519-1 à L.519-17 et R.519-1 à R.519-31 du Code monétaire et financier.<br>
    <span class="partner">Elle est partenaire de Airwallex (Europe) Limited, établissement de monnaie électronique réglementé en Europe, dont le siège européen est situé à Herengracht 168, Unit 201, 1016 BF Amsterdam, Pays-Bas.</span>
  </div>
</div></body></html>`;
}

function htmlBe(p: {
  dossier: DossierAttestation;
  map: Record<string, string>;
  code: string;
  qr: string;
  urlVerif: string;
  emission: Date;
}) {
  const { map, dossier, code, emission } = p;
  const nom = nomComplet(map, dossier);
  const naissance = parseDate(champ(map, "date_naissance") || dossier.utilisateur.profil?.dateNaissance || "");
  const rentree = parseDate(champ(map, "date_rentree"));
  const academique = anneeAcademique(rentree, emission);
  const validite = finValidite(rentree, emission, 12);
  const montant = montantEuros(map, dossier.espaceFinancier) || 12744;
  const mensuel = Math.round((montant / 12) * 100) / 100;
  const etablissement = champ(map, "etablissement") || "—";
  const garant = champ(map, "garant_financier") || "—";
  const numero = dossier.reference.replace(/^AVI-BE-/, "HCGF-BE-").replace(/^AVI-/, "HCGF-BE-");
  const iban = ibanAffiche("BE").replace(/\s/g, "");
  const banque = partenaire("BE");
  const urlCourte = urlVerificationPublique(p.urlVerif);
  const presidenteBe = "Madame Octavie MBIAKOUP KONGUEP";
  const recu = dossier.espaceFinancier?.montantRecu
    ? montantEuros(map, dossier.espaceFinancier)
    : montant;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(numero)}</title>
<style>${cssCommun()}
  .page { padding: 12mm 16mm 14mm; }
  h1 { color:#1d4fbf; text-align:center; font-size:15.5pt; letter-spacing:.06em; margin:8px 0 6px; font-weight:800; }
  h2 { color:#1d4fbf; font-size:11.5pt; margin:13px 0 5px; font-weight:700; }
  .bandeau { border:1.6px solid #1d4fbf; color:#1d4fbf; font-size:8pt; letter-spacing:.06em; text-align:center; padding:6px 8px; margin:4px 0 8px; font-weight:600; }
  .ref { text-align:center; font-weight:800; font-size:10.5pt; margin:0 0 10px; }
  .meta { font-size:10.2pt; line-height:1.55; }
  .meta .valid { color:#1d4fbf; font-weight:700; }
  .corps { text-align:justify; font-size:10.2pt; line-height:1.45; }
  .corps p { margin:0 0 8px; }
  .sign { font-size:10.2pt; margin-top:12px; }
  .sign p { margin:0 0 2px; }
  .annex { font-size:8.5pt; color:#333; text-align:justify; margin-top:10px; }
  .end { font-size:7.5pt; text-align:center; color:#555; margin-top:18px; line-height:1.4; }
  .end .num { float:right; }
  .qrline { display:flex; align-items:center; gap:10px; }
  .qrline svg { width:62px; height:62px; flex:none; }
</style></head><body><div class="page">
  ${enTeteBe()}
  <div class="bandeau">FORMULAIRE TYPE À COMPLÉTER - ÉMISSION CONDITIONNÉE AUX ACCORDS REQUIS</div>
  <h1>ATTESTATION DE VIREMENT IRRÉVOCABLE</h1>
  <p class="ref">AVI Belgique n° ${esc(numero)} · Année académique ${esc(academique.libelle)}</p>
  <div class="meta">
    <p><span class="valid">Date de fin de validité prévue : ${fmtFr(validite)}</span><br>
    <strong>Bénéficiaire :</strong> ${esc(nom)}${naissance ? `, né le ${fmtFr(naissance)}` : ""}<br>
    <strong>Garant financier :</strong> ${esc(garant)}<br>
    <strong>Établissement d’enseignement en Belgique :</strong> ${esc(etablissement)}<br>
    <span class="qrline"><span><strong>Code de vérification / QR code :</strong> ${esc(code)}</span>${p.qr}</span></p>
  </div>
  <h2>Déclaration de l’émetteur</h2>
  <div class="corps">
    <p>Nous soussignés, ${esc(MARQUE)} (${esc(SIGLE)}), société par actions simplifiée à associé unique au capital de ${esc(CAPITAL)} €, dont le siège social est situé ${esc(ADRESSE)}, immatriculée au RCS de Paris sous le numéro SIREN ${esc(SIREN)} et à l’ORIAS sous le n° ${esc(ORIAS)}, représentée par ${esc(presidenteBe)}, Présidente, décrivons les conditions de la garantie financière à établir pour les études du bénéficiaire en Belgique.</p>
  </div>
  <h2>Fonds et modalités de dépôt</h2>
  <div class="corps">
    <p>Pour l’année académique ${esc(academique.libelle)}, le montant de référence est de ${esc(sommeLettres(montant, "EUR"))} (${fmtMontant(montant, "EUR")}), correspondant à ${fmtMontant(mensuel, "EUR")} par mois pendant douze (12) mois. Ce montant est un seuil de référence, non une confirmation de réception des fonds.</p>
    <p>Montant effectivement reçu : ${fmtMontant(recu, "EUR")}.<br>
    Date de réception : ${fmtFr(emission)}.<br>
    Établissement dépositaire / partenaire financier : ${esc(banque)}.<br>
    Compte ou identifiant individualisé : ${esc(iban)}.</p>
    <p>Les fonds devront être conservés et protégés selon les conditions contractuelles et réglementaires applicables au prestataire agréé. La qualité de compte bloqué, les restrictions de retrait et les justificatifs de propriété ou d’affectation des fonds devront être attestés expressément par ce prestataire.</p>
  </div>
  <h2>Calendrier des virements et remboursement</h2>
  <div class="corps">
    <p>Sous réserve de la réception intégrale et de la disponibilité vérifiée des fonds, de l’accord contractuel du partenaire financier et de l’acceptation du dispositif par les autorités belges, le dispositif prévoit douze versements mensuels de ${fmtMontant(mensuel, "EUR")} sur un compte bancaire ouvert au nom de l’étudiant en Belgique, selon un calendrier communiqué au bénéficiaire.</p>
    <p>En cas de refus de visa, les modalités de restitution des fonds seront définies dans la convention signée avec l’étudiant et selon les exigences du prestataire financier. Les frais éventuels feront l’objet d’une information distincte.</p>
  </div>
  <div class="sign">
    <p>Fait à Paris, le ${fmtFr(emission)}</p>
    <p>${esc(presidenteBe)}</p>
    <p>Présidente - HCGF</p>
  </div>
  <p class="annex">Pièces à annexer lors d’une émission effective : preuve de dépôt, attestation du partenaire financier, confirmation des restrictions éventuelles, justificatifs d’identité et de lien avec le garant, calendrier de versements, justificatif d’inscription en Belgique.</p>
  <h2>VALIDITÉ ET AUTHENTIFICATION DE L’ATTESTATION</h2>
  <div class="corps">
    <p>La présente attestation est établie par HCGF dans le cadre de son dispositif de garantie financière pour les étudiants poursuivant leurs études en Belgique. Son authenticité peut être vérifiée grâce au numéro de référence et au code associé sur https://${esc(urlCourte.replace(/^https?:\/\//, ""))}. Les conditions de conservation des fonds et de versement mensuel sont précisées dans la convention conclue avec le bénéficiaire et l’établissement financier partenaire.</p>
    <p>Validité : jusqu’au ${fmtFr(validite)}, sauf renouvellement exprès après émission effective.</p>
  </div>
  <p class="end">HCGF - ${esc(ADRESSE)} | RCS Paris ${esc(RCS)} | ORIAS ${esc(ORIAS)}<br>
  DOCUMENT ÉMIS — FONDS REÇUS ET BLOQUÉS<span class="num">1</span></p>
</div></body></html>`;
}

function htmlDe(p: {
  dossier: DossierAttestation;
  map: Record<string, string>;
  code: string;
  qr: string;
  urlVerif: string;
  emission: Date;
  empreinte: string;
  uuid: string;
}) {
  const { map, dossier, code, emission, uuid } = p;
  const nom = nomComplet(map, dossier).toUpperCase();
  const naissance = parseDate(champ(map, "date_naissance") || dossier.utilisateur.profil?.dateNaissance || "");
  const lieu = champ(map, "lieu_naissance") || "—";
  const nationalite = champ(map, "nationalite") || "—";
  const passeport = champ(map, "numero_passeport") || "—";
  const email = champ(map, "email") || dossier.utilisateur.email;
  const montant = montantEuros(map, dossier.espaceFinancier);
  const mensuel = Math.round((montant / 12) * 100) / 100;
  const iban = (process.env.IBAN_PLATEFORME?.trim() || IBAN_DE_DEFAUT);
  const bic = bicAffiche();
  const banque = partenaire("DE");
  const ops = dossier.espaceFinancier?.operations ?? [];
  const entree = ops.find((o) => /recu|credit|encaiss/i.test(o.type))?.createdAt ?? emission;
  const urlCourte = urlVerificationPublique(p.urlVerif);

  const ligne = (k: string, v: string) =>
    `<tr><th>${k}</th><td>${esc(v)}</td></tr>`;

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${esc(dossier.reference)}</title>
<style>${cssCommun()}
  .hero { width:100%; border:1.5px solid #0b1f4d; border-collapse:collapse; }
  .hero td { border:0; }
  .hero .brand { width:28%; background:#fff; padding:10px 12px; border-right:1.5px solid #0b1f4d; }
  .hero .title { background:#0b1f4d; color:#fff; text-align:center; padding:14px 10px; }
  .hero h1 { font-size:16pt; letter-spacing:.12em; font-weight:700; }
  .hero .sub { font-size:9pt; letter-spacing:.18em; margin-top:4px; font-weight:600; }
  .meta4 { width:100%; border-collapse:collapse; margin:14px 0 18px; font-size:8.5pt; }
  .meta4 th { text-align:left; font-size:7.5pt; letter-spacing:.06em; color:#333; font-weight:700; }
  .meta4 td, .meta4 th { border:1px solid #222; padding:8px 10px; }
  h2 { font-size:12.5pt; margin:16px 0 8px; }
  table.kv { width:100%; border-collapse:collapse; font-size:10.5pt; }
  table.kv th { width:34%; text-align:left; background:#f7f7f7; font-weight:700; padding:7px 10px; border:1px solid #222; }
  table.kv td { padding:7px 10px; border:1px solid #222; }
  table.four { width:100%; border-collapse:collapse; font-size:10.5pt; }
  table.four th { text-align:left; background:#f7f7f7; font-weight:700; padding:7px 10px; border:1px solid #222; width:25%; }
  table.four td { padding:7px 10px; border:1px solid #222; }
  .note { border:1px solid #9ec5e8; background:#f3f9ff; padding:10px 12px; margin-top:12px; font-size:9.5pt; text-align:justify; }
  .note strong { font-size:10pt; }
  .cond { border-left:4px solid #1d4fbf; padding:0 0 10px 12px; margin:0 0 8px; }
  .cond strong { display:block; margin-bottom:2px; }
  .legal { border:1px solid #e0b44a; background:#fff8e8; padding:10px 12px; font-size:8.5pt; text-align:justify; margin:14px 0; }
  .qrwrap { display:flex; gap:16px; align-items:center; }
  .qrwrap svg { width:92px; height:92px; }
  .tiny { font-size:8pt; color:#333; text-align:justify; margin:10px 0; }
</style></head><body>
<div class="page">
  <table class="hero"><tr>
    <td class="brand"><img class="logo" src="${logoSrc()}" alt="HCGF"></td>
    <td class="title"><h1>SPERRKONTOBESCHEINIGUNG</h1><div class="sub">BLOCKED ACCOUNT CERTIFICATE</div></td>
  </tr></table>
  <table class="meta4">
    <tr>
      <th>DOKUMENTENSTATUS</th><th>AUSSTELLUNGSDATUM</th><th>DOKUMENTENNUMMER</th><th>VERIFIKATIONSCODE</th>
    </tr>
    <tr>
      <td>Gültig – Gelder eingegangen und gesperrt</td>
      <td>${fmtDe(emission)}</td>
      <td>${esc(dossier.reference)}</td>
      <td>${esc(code)}</td>
    </tr>
  </table>
  <h2>1. Kontoinhaber</h2>
  <table class="kv">
    ${ligne("Vollständiger Name", nom)}
    ${ligne("Geburtsdatum und Geburtsort", `${naissance ? fmtDe(naissance) : "—"} – ${lieu}`)}
    ${ligne("Staatsangehörigkeit", nationalite)}
    ${ligne("Reisepassnummer", passeport)}
    ${ligne("E-Mail-Adresse", email)}
  </table>
  <h2>2. Bankverbindung</h2>
  <table class="kv">
    ${ligne("Kontoführendes Institut", banque)}
    ${ligne("IBAN", iban)}
    ${ligne("BIC / SWIFT", bic)}
    ${ligne("Interne Kontoreferenz", dossier.reference)}
  </table>
  <h2>3. Bestätigung der Geldmittel</h2>
  <table class="four">
    <tr><th>Eingegangener Betrag</th><td>${fmtMontantDe(montant)}</td><th>Eingangsdatum</th><td>${fmtDe(entree)}</td></tr>
    <tr><th>Gesperrter Betrag</th><td>${fmtMontantDe(montant)}</td><th>Währung</th><td>${esc(dossier.espaceFinancier?.devise || "EUR")}</td></tr>
    <tr><th>Maximal verfügbarer Monatsbetrag</th><td>${fmtMontantDe(mensuel)}</td><th>Sperrdauer</th><td>12 Monate</td></tr>
  </table>
  <div class="note"><strong>Bestätigung:</strong> Hiermit wird bestätigt, dass die oben genannten Geldmittel ordnungsgemäß eingegangen, dem Sperrkonto gutgeschrieben und gemäß den vertraglichen Bedingungen gesperrt wurden. Über die Gelder kann erst nach Aktivierung des Kontos verfügt werden. Auszahlungen erfolgen ausschließlich bis zur festgelegten monatlichen Freigabegrenze und unterliegen den geltenden vertraglichen Bestimmungen, den Identitätsprüfungen sowie den einschlägigen gesetzlichen Vorschriften der Bundesrepublik Deutschland.</div>
</div>
<div class="page page-break" style="padding-top:8px">
  <h2>4. Freigabebedingungen / Release conditions</h2>
  <div class="cond"><strong>Aktivierung:</strong> Die monatliche Freigabe beginnt ausschließlich nach der abschließenden Identitätsprüfung und der Vorlage aller erforderlichen Nachweise.</div>
  <div class="cond"><strong>Auszahlungen:</strong> Die Mittel werden gemäß dem im Zertifikat angegebenen monatlichen Höchstbetrag und dem vertraglich festgelegten Zahlungsplan freigegeben.</div>
  <div class="cond"><strong>Einschränkungen:</strong> Eine vollständige Abhebung, freie Übertragung oder vorzeitige Rückerstattung ist ohne schriftliche Genehmigung und Vorlage eines gültigen Nachweises nicht zulässig und erfolgt vorbehaltlich der Produktbedingungen.</div>
  <div class="cond"><strong>Visaablehnung oder Projektabbruch:</strong> Eine eventuelle Rückerstattung erfolgt ausschließlich nach Vorlage der erforderlichen Nachweise, vorbehaltlich der Konformitätsprüfungen und der vertraglich geltenden Abzüge.</div>
  <div class="cond"><strong>Konsularische Überprüfung:</strong> Die Echtheit dieses Zertifikats kann über den QR-Code oder den eindeutigen Verifizierungscode geprüft werden.</div>
  <h2>5. Dokumentenverifikation</h2>
  <div class="qrwrap">
    ${p.qr}
    <div>
      Scannen Sie den QR-Code, um die offizielle Verifikationsseite aufzurufen.<br>
      Verifikationsadresse: <strong>${esc(urlCourte)}</strong><br>
      Eindeutiger Code: <strong>${esc(code)}</strong><br>
      <span class="muted" style="font-size:9pt">Die Verifikationsseite zeigt mindestens: Dokumentenstatus, Name des Kontoinhabers, gesperrter Betrag, Ausstellungsdatum und Name des Ausstellers.</span>
    </div>
  </div>
  <h2>6. Elektronische Signatur und Prüfspur</h2>
  <table class="kv">
    ${ligne("Aussteller", `${MARQUE} (${SIGLE})`)}
    ${ligne("Bevollmächtigter Unterzeichner", `${PRESIDENTE} — Présidente`)}
    ${ligne("Elektronische Signatur", uuid)}
    ${ligne("Zeitstempel", fmtHeure(emission))}
    <tr><th>Dokumenten-Fingerabdruck (SHA-256)</th><td style="font-family:Consolas,monospace;font-size:9pt">${esc(p.empreinte)}</td></tr>
  </table>
  <div class="legal"><strong>Rechtliche Hinweise:</strong> Folgende rechtlich relevante Informationen werden automatisch angezeigt: Firmenbezeichnung, Rechtsform, Stammkapital, Sitz, Handelsregisternummer, ORIAS-Nummer (falls zutreffend), Qualität des Vermittlers, Beschwerdestelle, Anwendung der Datenschutzrichtlinie und allgemeine Geschäftsbedingungen. HCGF ist kein Kreditinstitut und keine Zahlungsdienstleisterin, sofern dies nicht ausdrücklich gesetzlich erlaubt ist.</div>
  <p class="tiny"><strong>(DE)</strong> ${esc(MARQUE)} (${esc(SIGLE)}) ist im Handels- und Gesellschaftsregister Paris unter der Nr. ${esc(RCS)} eingetragen und unter der ORIAS-Nr. ${esc(ORIAS)} als Makler für Bankgeschäfte und Zahlungsdienste (COBSP) gemäß den Artikeln L.519-1 ff. des französischen Währungs- und Finanzgesetzbuches registriert. Das Unternehmen verfügt über eine Berufshaftpflichtversicherung sowie eine Finanzgarantie, die von ${esc(GARANT)} unter der Versicherungspolice Nr. ${esc(REF_GARANTIE)} gewährt werden. HCGF ist kein Kreditinstitut und arbeitet gegebenenfalls mit zugelassenen Kreditinstituten und regulierten Finanzpartnern zusammen. Die in diesem Dokument enthaltenen Informationen dienen ausschließlich der Bearbeitung des Antrags auf Eröffnung eines Sperrkontos und können von den zuständigen Behörden überprüft werden.</p>
  <p class="tiny"><strong>(EN)</strong> ${esc(MARQUE)} (${esc(SIGLE)}) is registered with the Paris Trade and Companies Register under No. ${esc(RCS)} and with ORIAS under No. ${esc(ORIAS)} as a Banking Operations and Payment Services Broker (COBSP) in accordance with Articles L.519-1 et seq. of the French Monetary and Financial Code. The company is covered by Professional Indemnity Insurance and a Financial Guarantee issued by ${esc(GARANT)} under policy No. ${esc(REF_GARANTIE)}. HCGF is not a credit institution and may cooperate with duly authorised credit institutions and regulated financial partners for the provision of its services. The information contained in this document is intended solely for processing the blocked account application and may be verified by the competent authorities.</p>
</div>
</body></html>`;
}

function enTeteIt() {
  return `
  <table class="it-head">
    <tr>
      <td class="it-logo"><img class="logo" src="${logoSrc()}" alt="HCGF"></td>
      <td class="it-addr">
        <strong>${esc(MARQUE)}</strong><br>
        ${esc(ADRESSE)}<br>
        ${esc(EMAIL)} · ${esc(TEL)}<br>
        RCS Paris : ${esc(RCS)} · ORIAS : ${esc(ORIAS)}
      </td>
    </tr>
  </table>
  <div class="it-rule"></div>`;
}

function htmlIt(p: {
  dossier: DossierAttestation;
  map: Record<string, string>;
  code: string;
  qr: string;
  urlVerif: string;
  emission: Date;
}) {
  const { map, dossier, code, emission } = p;
  const nom = nomComplet(map, dossier);
  const naissance = parseDate(champ(map, "date_naissance") || dossier.utilisateur.profil?.dateNaissance || "");
  const rentree = parseDate(champ(map, "date_rentree"));
  const duree = Number(champ(map, "duree_mois") || 12) || 12;
  const academique = anneeAcademique(rentree, emission);
  const validite = finValidite(rentree, emission, duree);
  const montant = montantEuros(map, dossier.espaceFinancier);
  const mensuel = Math.round((montant / (duree || 12)) * 100) / 100;
  const etablissement = champ(map, "etablissement") || "—";
  const formation = champ(map, "formation") || "—";
  const nationalite = champ(map, "nationalite") || "—";
  const passeport = champ(map, "numero_passeport") || "—";
  const garant = champ(map, "garant_financier");
  const avecGarant = Boolean(garant);
  const numero = dossier.reference.replace(/^AVI-IT-/, "HCGF-IT-").replace(/^AVI-/, "HCGF-IT-");
  const iban = ibanAffiche("IT");
  const banque = partenaire("IT");
  const urlCourte = urlVerificationPublique(p.urlVerif);
  const presidente = "Madame Octavie MBIAKOUP KONGUEP";
  const recuLe = dossier.espaceFinancier?.operations?.find((o) => o.type === "recu")?.createdAt ?? emission;
  const naissanceFr = naissance ? fmtFr(naissance) : "—";
  const naissanceEn = naissance ? fmtEn(naissance) : "—";
  const montantChiffres = `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant)} EUR`;
  const lettresFr = sommeLettres(montant, "EUR");
  const lettresEn = `${enLettresEn(montant)} euros`;
  const mensuelFr = fmtMontant(mensuel, "EUR");
  const natPasseport = `${nationalite} / ${passeport}`;

  const recuFr = avecGarant
    ? `reçu le ${mark(fmtFr(recuLe))} de ${mark(garant)}, agissant en qualité de garant financier de ${mark(nom)}`
    : `reçu le ${mark(fmtFr(recuLe))} de ${mark(nom)}, bénéficiaire désigné ci-dessus`;
  const recuIt = avecGarant
    ? `ricevuto in data ${mark(fmtFr(recuLe))} da ${mark(garant)}, in qualità di garante finanziario di ${mark(nom)}`
    : `ricevuto in data ${mark(fmtFr(recuLe))} da ${mark(nom)}, beneficiario sopra indicato`;
  const recuEn = avecGarant
    ? `received on ${mark(fmtEn(recuLe))} from ${mark(garant)}, acting as financial guarantor of ${mark(nom)}`
    : `received on ${mark(fmtEn(recuLe))} from ${mark(nom)}, the beneficiary named above`;
  const restitutionFr = avecGarant ? "au payeur" : "au bénéficiaire";
  const restitutionIt = avecGarant ? "al pagatore" : "al beneficiario";
  const restitutionEn = avecGarant ? "to the payer" : "to the beneficiary";

  const fiche = (rows: [string, string][]) =>
    `<table class="it-fiche">${rows
      .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`)
      .join("")}</table>`;

  const pied = (n: number) =>
    `<p class="it-legal">HORIZON CAUTION &amp; GARANTIE FINANCIÈRE — SASU au capital de ${esc(CAPITAL)} EUR — ${esc(ADRESSE)} — RCS Paris ${esc(RCS)} — ORIAS ${esc(ORIAS)} — garantie financière ${esc(GARANT)} n° ${esc(REF_GARANTIE)}.</p>
     <p class="it-page">Page ${n} / 3</p>`;

  const verif = (libelle: string) =>
    `<table class="it-verif"><tr>
      <td class="qrbox">${p.qr}</td>
      <td>${esc(libelle)}<br><strong>${esc(urlCourte)}</strong><br>Code : <strong>${esc(code)}</strong></td>
    </tr></table>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(numero)}</title>
<style>${cssCommun()}
  .page { padding: 12mm 16mm 12mm; }
  .it-head { width:100%; border-collapse:collapse; }
  .it-logo { width:28%; padding:0; vertical-align:middle; }
  .it-addr { text-align:right; font-size:9pt; line-height:1.4; vertical-align:middle; }
  .it-rule { border-top:2.4px solid #1d4fbf; border-bottom:1px solid #1d4fbf; height:5px; margin:8px 0 12px; }
  .it-title { color:#1d4fbf; text-align:center; font-size:12.2pt; font-weight:800; line-height:1.25; margin:0 0 12px; text-transform:uppercase; }
  .it-fiche { width:100%; border-collapse:collapse; margin:0 0 12px; }
  .it-fiche th { width:34%; background:#d6e6f5; text-align:left; padding:6px 10px; font-size:9.6pt; font-weight:700; border:1px solid #c5d4e4; }
  .it-fiche td { background:#f4edd6; padding:6px 10px; font-size:9.6pt; border:1px solid #c5d4e4; }
  .it-corps { text-align:justify; font-size:9.7pt; line-height:1.42; }
  .it-montant { text-align:center; font-weight:800; font-size:12pt; margin:12px 0; }
  .it-sign { text-align:right; margin-top:18px; font-size:10pt; }
  .it-verif { width:100%; border-collapse:collapse; margin-top:14px; }
  .it-verif td { vertical-align:middle; font-size:9pt; }
  .it-verif .qrbox { width:78px; padding-right:10px; }
  .it-verif .qrbox svg { width:72px; height:72px; display:block; }
  .it-legal { margin-top:16px; font-size:7pt; color:#555; text-align:justify; line-height:1.3; }
  .it-page { text-align:center; font-size:8pt; color:#666; margin:6px 0 0; }
</style></head><body>
<div class="page">
  ${enTeteIt()}
  <h1 class="it-title">Attestation de fonds bloqués<br>et de virement irrévocable — visa d’études Italie</h1>
  ${fiche([
    ["N° AVI", mark(numero)],
    ["Bénéficiaire", mark(nom)],
    ["Date de naissance", mark(naissanceFr)],
    ["Nationalité / passeport", mark(natPasseport)],
    ["Établissement", mark(etablissement)],
    ["Formation", mark(formation)],
    ["Année universitaire", mark(academique.libelle)],
    ["Validité", mark(fmtFr(validite))],
  ])}
  <div class="it-corps">
    <p>Nous soussignés, <strong>${esc(MARQUE)} (${esc(SIGLE)})</strong>, attestons avoir ${recuFr} la somme de :</p>
    <p class="it-montant">${mark(`${montantChiffres} — ${lettresFr}`)}</p>
    <p>Ces fonds sont bloqués sur un compte de paiement ouvert dans les livres de <strong>${esc(banque)}</strong>, établissement de monnaie électronique réglementé, IBAN <strong>${esc(iban)}</strong>.</p>
    <p>${esc(SIGLE)} bénéficie d’une garantie financière délivrée par ${mark(GARANT)} sous la référence n° ${mark(REF_GARANTIE)}.</p>
    <p>Nous nous engageons, après obtention du visa d’études, à verser mensuellement au bénéficiaire la somme de ${mark(mensuelFr)} pendant ${mark(`${duree} mois`)}.</p>
    <p>À l’issue de la période de validité, le solde éventuel sera restitué ${esc(restitutionFr)}.</p>
    <p>En cas de divergence entre les versions, la version française prévaut.</p>
  </div>
  <div class="it-sign">
    <p>Fait à Paris, le ${fmtFr(emission)}</p>
    <p><strong>${esc(presidente)}</strong><br>Présidente</p>
  </div>
  ${verif("Vérification de l’authenticité :")}
  ${pied(1)}
</div>
<div class="page page-break">
  ${enTeteIt()}
  <h1 class="it-title">Attestazione di fondi vincolati<br>e di bonifico irrevocabile — visto di studio per l’Italia</h1>
  ${fiche([
    ["N. AVI", mark(numero)],
    ["Beneficiario", mark(nom)],
    ["Data di nascita", mark(naissanceFr)],
    ["Nazionalità / passaporto", mark(natPasseport)],
    ["Istituto", mark(etablissement)],
    ["Corso di studio", mark(formation)],
    ["Anno accademico", mark(academique.libelle)],
    ["Validità", mark(fmtFr(validite))],
  ])}
  <div class="it-corps">
    <p>Noi sottoscritti, <strong>${esc(MARQUE)} (${esc(SIGLE)})</strong>, attestiamo di aver ${recuIt} la somma di :</p>
    <p class="it-montant">${mark(`${montantChiffres} — ${lettresFr}`)}</p>
    <p>Tali fondi sono vincolati su un conto di pagamento aperto presso <strong>${esc(banque)}</strong>, istituto di moneta elettronica regolamentato, IBAN <strong>${esc(iban)}</strong>.</p>
    <p>${esc(SIGLE)} beneficia di una garanzia finanziaria rilasciata da ${mark(GARANT)} con riferimento n. ${mark(REF_GARANTIE)}.</p>
    <p>Ci impegniamo, dopo il rilascio del visto di studio, a versare mensilmente al beneficiario la somma di ${mark(mensuelFr)} per ${mark(`${duree} mesi`)}.</p>
    <p>Al termine del periodo di validità, l’eventuale saldo sarà restituito ${esc(restitutionIt)}.</p>
    <p>In caso di divergenza tra le versioni, prevale la versione francese.</p>
  </div>
  <div class="it-sign">
    <p>Fatto a Parigi, il ${fmtFr(emission)}</p>
    <p><strong>${esc(presidente)}</strong><br>Presidente</p>
  </div>
  ${verif("Verifica dell’autenticità :")}
  ${pied(2)}
</div>
<div class="page page-break">
  ${enTeteIt()}
  <h1 class="it-title">Certificate of blocked funds<br>and irrevocable transfer — study visa for Italy</h1>
  ${fiche([
    ["AVI No.", mark(numero)],
    ["Beneficiary", mark(nom)],
    ["Date of birth", mark(naissanceEn)],
    ["Nationality / passport", mark(natPasseport)],
    ["Institution", mark(etablissement)],
    ["Course of study", mark(formation)],
    ["Academic year", mark(academique.libelle)],
    ["Validity", mark(fmtEn(validite))],
  ])}
  <div class="it-corps">
    <p>We, the undersigned, <strong>${esc(MARQUE)} (${esc(SIGLE)})</strong>, hereby certify that we ${recuEn} the sum of:</p>
    <p class="it-montant">${mark(`${montantChiffres} — ${lettresEn}`)}</p>
    <p>These funds are blocked on a payment account held with <strong>${esc(banque)}</strong>, a regulated electronic money institution, IBAN <strong>${esc(iban)}</strong>.</p>
    <p>${esc(SIGLE)} benefits from a financial guarantee issued by ${mark(GARANT)} under reference ${mark(REF_GARANTIE)}.</p>
    <p>We undertake, after the study visa has been granted, to transfer monthly to the beneficiary the sum of ${mark(mensuelFr)} for ${mark(`${duree} months`)}.</p>
    <p>At the end of the validity period, any remaining balance shall be returned ${esc(restitutionEn)}.</p>
    <p>In the event of any discrepancy, the French version shall prevail.</p>
  </div>
  <div class="it-sign">
    <p>Done in Paris, on ${fmtEn(emission)}</p>
    <p><strong>${esc(presidente)}</strong><br>President</p>
  </div>
  ${verif("Authenticity verification:")}
  ${pied(3)}
</div>
</body></html>`;
}

function htmlGenerique(dossier: DossierAttestation, signataire: string, emission: Date) {
  const lignes = dossier.reponses
    .map((r) => `<tr><th>${esc(r.champ.libelle)}</th><td>${esc(r.valeur || "—")}</td></tr>`)
    .join("");
  const annexes = dossier.documents
    .filter((d) => d.type === "transmis")
    .map((d, i) => `<li>${i + 2}. ${esc(d.piece?.libelle ?? d.nom)} — ${esc(d.statut)}</li>`)
    .join("");
  const candidat = `${dossier.utilisateur.profil?.prenom ?? ""} ${dossier.utilisateur.profil?.nom ?? dossier.utilisateur.email}`.trim();
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(dossier.reference)}</title>
  <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#152238}
  h1{font-weight:400} table{width:100%;border-collapse:collapse} th,td{border-top:1px solid #ddd4c6;padding:8px;text-align:left}
  .meta{color:#6a6258;font-size:13px}</style></head><body>
  <p>${esc(dossier.offre.service.libelle)} — Document officiel</p>
  <h1>${esc(dossier.offre.service.libelle)} · ${esc(dossier.offre.pays.libelle)}</h1>
  <p class="meta">${esc(dossier.reference)} · Signé le ${esc(emission.toLocaleString("fr-FR"))} par ${esc(signataire)}</p>
  <p>Candidat : ${esc(candidat)}</p>
  <table>${lignes}</table>
  <h2>Pièces fusionnées</h2>
  <ol><li>1. Formulaire signé</li>${annexes}</ol>
  <p class="meta">Formulaire en première partie. Version verrouillée. Toute régénération créera une nouvelle version.</p>
  </body></html>`;
}

export async function htmlDocumentFinal(opts: {
  dossier: DossierAttestation;
  signataire: string;
  codeVerification: string;
  dateSignature?: Date;
}) {
  const emission = opts.dateSignature ?? new Date();
  if (opts.dossier.offre.codeService !== "AVI") {
    return htmlGenerique(opts.dossier, opts.signataire, emission);
  }
  const map: Record<string, string> = {};
  for (const r of opts.dossier.reponses) map[r.champ.code] = r.valeur;
  const base = await origine();
  const urlVerif = `${base}/verifier/${opts.codeVerification}`;
  const qr = await qrSvg(urlVerif);
  const pays = opts.dossier.offre.codePays;
  if (pays === "DE") {
    const uuid = randomUUID().toUpperCase();
    const brouillon = htmlDe({
      dossier: opts.dossier,
      map,
      code: opts.codeVerification,
      qr,
      urlVerif,
      emission,
      empreinte: EMPREINTE,
      uuid,
    });
    const empreinte = hashBuffer(brouillon);
    return brouillon.replace(EMPREINTE, empreinte);
  }
  if (pays === "BE") {
    return htmlBe({
      dossier: opts.dossier,
      map,
      code: opts.codeVerification,
      qr,
      urlVerif,
      emission,
    });
  }
  if (pays === "IT") {
    return htmlIt({
      dossier: opts.dossier,
      map,
      code: opts.codeVerification,
      qr,
      urlVerif,
      emission,
    });
  }
  return htmlFr({
    dossier: opts.dossier,
    map,
    pays,
    code: opts.codeVerification,
    qr,
    urlVerif,
    emission,
    signataire: opts.signataire,
  });
}

