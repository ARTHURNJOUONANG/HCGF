import { readFileSync } from "fs";
import path from "path";

const MARQUE = "Horizon Caution & Garantie Financière";
const SIGLE = "HCGF";
const PRESIDENTE = "Madame Octavie Mbiakoup Konguep";
const ORIAS = "26006261";
const SIREN = "102 527 371";
const CAPITAL = "10 000";
const ADRESSE = "50 avenue des Champs-Élysées, 75008 Paris";
const EMAIL = "contact@hcgf.fr";
const SITE = "www.hcgf.fr";
const FRAIS_PRESTATION = 400;
const CAUTION_FR_DEFAUT = 10530;
const MENSUEL_FR_DEFAUT = 877.5;
const TRANSFERT_FCFA = 130000;

type Reponse = { valeur: string; champ: { code: string } };

export type DossierContrat = {
  reference: string;
  reponses: Reponse[];
  offre: { codePays: string; pays: { libelle: string } };
  utilisateur: {
    email: string;
    profil?: {
      nom?: string | null;
      prenom?: string | null;
      dateNaissance?: string | null;
      telephone?: string | null;
      adresse?: string | null;
      nationalite?: string | null;
    } | null;
  };
};

export type SignatureContrat = {
  date: Date;
  lieu: string;
  nomSignataire: string;
  preuve: string;
};

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
  const t = s.trim() || "—";
  return `<mark>${esc(t)}</mark>`;
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

function fmtLong(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(d);
}

function fmtFr(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function euros(n: number) {
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n)} euros`;
}

function destination(pays: string) {
  if (pays === "BE") return "en Belgique";
  if (pays === "IT") return "en Italie";
  if (pays === "DE") return "en Allemagne";
  if (pays === "CA") return "au Canada";
  return "en France";
}

function cautionPour(pays: string, map: Record<string, string>) {
  const brut = champ(map, "montant_avi").replace(",", ".");
  const saisi = Number(brut);
  if (Number.isFinite(saisi) && saisi > 0) return saisi > 50000 ? saisi / 100 : saisi;
  return pays === "FR" ? CAUTION_FR_DEFAUT : 0;
}

function enTete() {
  return `
  <table class="ct-head">
    <tr>
      <td class="ct-logo"><img src="${logoSrc()}" alt="HCGF"></td>
      <td class="ct-addr">
        <strong>${esc(MARQUE)}</strong><br>
        Siège social : 50 avenue des Champs-Élysées<br>
        75008 Paris, France<br>
        ${esc(EMAIL)} &nbsp;|&nbsp; ${esc(SITE)}<br>
        SIREN ${esc(SIREN)} &nbsp;|&nbsp; ORIAS n° ${esc(ORIAS)}
      </td>
    </tr>
  </table>
  <p class="ct-agences"><strong>Agences au Cameroun</strong><br>
  Yaoundé : avenue Kennedy, en face de l’immeuble Adamaoua. &nbsp;|&nbsp; Douala : Bonamoussadi Sable</p>`;
}

function pied() {
  return `<p class="ct-foot">${esc(MARQUE)} &nbsp;|&nbsp; SASU au capital de ${esc(CAPITAL)} € &nbsp;|&nbsp; RCS Paris ${esc(SIREN)}</p>`;
}

function article(num: string, titre: string, corps: string) {
  return `<h2>Article ${esc(num)} ${esc(titre)}</h2>${corps}`;
}

export function htmlContratAvi(opts: { dossier: DossierContrat; signature?: SignatureContrat | null }) {
  const map: Record<string, string> = {};
  for (const r of opts.dossier.reponses) map[r.champ.code] = r.valeur;
  const pays = opts.dossier.offre.codePays;
  const dest = destination(pays);
  const nom = `${champ(map, "nom") || opts.dossier.utilisateur.profil?.nom || ""} ${champ(map, "prenom") || opts.dossier.utilisateur.profil?.prenom || ""}`.trim();
  const naissance = parseDate(champ(map, "date_naissance") || opts.dossier.utilisateur.profil?.dateNaissance || "");
  const lieu = champ(map, "lieu_naissance");
  const naissanceTxt = naissance ? `${fmtLong(naissance)}${lieu ? ` à ${lieu}` : ""}` : lieu || "—";
  const adresse = champ(map, "adresse") || opts.dossier.utilisateur.profil?.adresse || "—";
  const nationalite = champ(map, "nationalite") || opts.dossier.utilisateur.profil?.nationalite || "—";
  const tel = champ(map, "telephone") || opts.dossier.utilisateur.profil?.telephone || "—";
  const email = champ(map, "email") || opts.dossier.utilisateur.email;
  const etablissement = champ(map, "etablissement") || "—";
  const duree = Number(champ(map, "duree_mois") || 12) || 12;
  const caution = cautionPour(pays, map);
  const mensuel = pays === "FR" && caution === CAUTION_FR_DEFAUT ? MENSUEL_FR_DEFAUT : Math.round((caution / duree) * 100) / 100;
  const totalPrestation = caution + FRAIS_PRESTATION;
  const sig = opts.signature;
  const etudiant = "l’Étudiant(e)";
  const Etudiant = "L’Étudiant(e)";

  const fiche = [
    ["Nom et prénoms", nom],
    ["Adresse", adresse],
    ["Date et lieu de naissance", naissanceTxt],
    ["Nationalité", nationalite],
    ["Téléphone", tel],
    ["Adresse électronique", email],
    ["Établissement d’accueil", etablissement],
  ];

  const fait = sig
    ? `Fait à ${esc(sig.lieu)}&nbsp;&nbsp;&nbsp; Le ${esc(fmtFr(sig.date))}&nbsp;&nbsp;&nbsp; En deux exemplaires`
    : "Fait à ______________________________&nbsp;&nbsp;&nbsp; Le ____ / ____ / ______&nbsp;&nbsp;&nbsp; En deux exemplaires";
  const blocEtudiant = sig
    ? `<strong>${esc(sig.nomSignataire)}</strong><br>Lu et approuvé<br><span class="preuve">Preuve ${esc(sig.preuve)}</span>`
    : `${Etudiant} ou son représentant légal<br>Nom, mention lu et approuvé, signature`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Contrat AVI ${esc(opts.dossier.reference)}</title>
<style>
  :root { color-scheme: only light; }
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #ececec; color: #111; font: 10.4pt/1.42 "Calibri", "Segoe UI", Arial, sans-serif; }
  mark { background: #fff59d; color: #111; padding: 0 1px; }
  .page { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 12mm 16mm 14mm; background: #fff; box-shadow: 0 2px 14px rgba(0,0,0,.12); }
  .ct-head { width: 100%; border-collapse: collapse; }
  .ct-logo { width: 42%; vertical-align: middle; padding: 0; }
  .ct-logo img { height: 58px; width: auto; display: block; }
  .ct-addr { text-align: right; font-size: 8.6pt; line-height: 1.35; vertical-align: middle; }
  .ct-agences { text-align: center; font-size: 8.4pt; margin: 10px 0 14px; line-height: 1.4; }
  h1 { text-align: center; font-size: 16pt; margin: 4px 0 6px; font-weight: 800; }
  .ct-sub { text-align: center; font-style: italic; margin: 0 0 14px; }
  .ct-intro { text-align: justify; margin: 0 0 10px; }
  .ct-fiche { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
  .ct-fiche th { width: 34%; text-align: left; font-weight: 700; padding: 5px 10px; background: #eef2f6; border-bottom: 1px solid #e3e8ee; }
  .ct-fiche td { padding: 5px 10px; border-bottom: 1px solid #e3e8ee; }
  h2 { font-size: 11.2pt; margin: 13px 0 6px; }
  p { text-align: justify; margin: 0 0 8px; }
  .ct-sign { margin-top: 18px; text-align: center; }
  .ct-boxes { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .ct-boxes td { width: 50%; background: #f3f5f7; padding: 14px 12px; vertical-align: top; font-size: 9.6pt; line-height: 1.45; }
  .preuve { font-size: 8pt; color: #555; }
  .ct-foot { text-align: center; font-size: 8pt; color: #555; margin-top: 22px; }
  @media print {
    html, body { background: #fff; }
    .page { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 0; }
    .page-break { page-break-before: always; }
  }
</style></head><body>
<div class="page">
  ${enTete()}
  <h1>Contrat de prestations de services AVI</h1>
  <p class="ct-sub">Attestation de virement irrévocable pour études ${esc(dest)}</p>
  <p class="ct-intro"><strong>Entre les soussignés</strong></p>
  <p>${esc(MARQUE)}, sigle ${esc(SIGLE)}, société par actions simplifiée unipersonnelle au capital de ${esc(CAPITAL)} euros, dont le siège social est situé ${esc(ADRESSE)}, immatriculée au RCS de Paris sous le numéro SIREN ${esc(SIREN)}, inscrite à l’ORIAS sous le numéro ${esc(ORIAS)}, représentée par ${esc(PRESIDENTE)}, en sa qualité de Présidente, dûment habilitée aux fins des présentes,</p>
  <p><em>Ci-après désignée HCGF, d’une part</em></p>
  <table class="ct-fiche">${fiche.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${mark(v)}</td></tr>`).join("")}</table>
  <p><em>Ci-après désigné(e) ${etudiant}, d’autre part. HCGF et ${etudiant} sont ci-après collectivement désignées les Parties.</em></p>
  <h2>Préambule</h2>
  <p>HCGF accompagne les étudiants internationaux dans leurs démarches de mobilité et de disponibilité financière. ${Etudiant} souhaite poursuivre ses études ${esc(dest)} au sein de l’établissement indiqué ci-dessus et justifier de ressources suffisantes dans le cadre de sa demande de visa.</p>
  <p>${Etudiant} a demandé à HCGF de constituer son dossier et de lui délivrer une attestation de virement irrévocable, ci-après l’AVI. Les Parties ont donc convenu ce qui suit.</p>
  ${article("1", "Objet", `<p>Le présent contrat définit les conditions dans lesquelles HCGF instruit la demande, organise la disponibilité des fonds et délivre l’AVI au bénéfice de ${etudiant}, sous réserve de la réception d’un dossier complet et de l’encaissement effectif de toutes les sommes dues.</p>`)}
  ${article("2", "Mission de HCGF", `<p>HCGF vérifie les pièces transmises, confirme les modalités financières applicables, organise la réception et la sécurisation des fonds, puis délivre l’AVI. Après l’arrivée de ${etudiant} ${esc(dest)} et la réception des justificatifs prévus à l’article 7, HCGF effectue les virements mensuels sur un compte bancaire ouvert au nom de ${etudiant}.</p><p>HCGF n’intervient ni dans la décision d’admission de l’établissement ni dans la décision souveraine de délivrance du visa.</p>`)}
  ${pied()}
</div>
<div class="page page-break">
  ${enTete()}
  ${article("3", "Conditions financières", `<p>Le montant minimum de la caution prévu au présent contrat est fixé à ${mark(euros(caution))} pour une durée de ${mark(`${duree} mois`)}. Ce montant correspond au seuil de ressources applicable réparti sur ${esc(String(duree))} mois, soit ${esc(String(duree))} virements mensuels de ${mark(euros(mensuel))}. Chaque candidat est libre d’augmenter ce montant selon ses besoins. Le montant choisi est renseigné dans l’application et confirmé avant paiement et émission de l’AVI.</p><p>En cas de montant supérieur, le montant des virements mensuels est calculé sur la base de la caution effectivement constituée, répartie sur ${esc(String(duree))} mois. Un éventuel écart d’arrondi est régularisé lors du dernier virement. Le montant total et le calendrier figurent dans l’AVI.</p><p>Les fonds destinés aux virements mensuels demeurent distincts des frais de prestation de HCGF et des frais de transfert. Ces frais sont réglés en supplément de la caution. Toute modification du montant, de la durée ou du calendrier doit faire l’objet d’un écrit accepté par les Parties avant l’émission de l’AVI.</p>`)}
  ${article("3 bis", "Frais de prestation de HCGF", `<p>Les frais de prestation de HCGF sont fixés à ${mark(euros(FRAIS_PRESTATION))}. Ils rémunèrent l’instruction et le traitement du dossier ainsi que la délivrance de l’AVI. Ils sont distincts de la caution destinée aux virements mensuels et des frais de transfert visés à l’article 4.</p><p>Pour une caution de ${mark(euros(caution))}, le total de la caution et des frais de prestation s’élève à ${mark(euros(totalPrestation))}, auquel s’ajoutent les frais de transfert applicables aux paiements effectués au Cameroun et les éventuels frais bancaires, de change ou de paiement. Les conditions de remboursement des frais de prestation sont précisées à l’article 8, sous réserve des droits prévus à l’article 9.</p>`)}
  ${article("4", "Modalités de versement", `<p>Le règlement est effectué exclusivement par les canaux officiels communiqués par HCGF : paiement sécurisé en ligne ou virement vers un compte indiqué par HCGF. Le payeur doit mentionner la référence du dossier ${mark(opts.dossier.reference)} et pouvoir justifier l’origine des fonds.</p><p>Au Cameroun, les versements pourront être effectués sur les comptes ouverts au nom de Horizon Caution &amp; Garantie Financière Cameroun auprès d’UBA ou de CCA Bank, selon les coordonnées bancaires officielles communiquées au client après leur ouverture.</p><p>Pour tout paiement de la caution effectué au Cameroun dans l’un des comptes de Horizon Caution &amp; Garantie Financière Cameroun, des frais de transfert des fonds vers la France sont exigibles. Ces frais sont évalués à ${mark(`${new Intl.NumberFormat("fr-FR").format(TRANSFERT_FCFA)} FCFA`)} pour une caution de ${esc(euros(pays === "FR" ? CAUTION_FR_DEFAUT : caution))}. Ils peuvent être diminués ou augmentés en fonction du montant de la caution à bloquer.</p><p>Le montant des frais de transfert applicable au dossier est communiqué au candidat avant paiement. Il s’ajoute à la caution et aux frais de prestation de ${esc(euros(FRAIS_PRESTATION))}, sans réduire le montant de la caution indiqué sur l’AVI.</p><p>HCGF peut suspendre le traitement du dossier et demander toute pièce complémentaire nécessaire au respect de ses obligations de connaissance du client, de lutte contre le blanchiment de capitaux et le financement du terrorisme. Aucun collaborateur ou intermédiaire n’est autorisé à recevoir des espèces au nom de HCGF.</p>`)}
  ${article("5", "Contenu de l’AVI", `<p>L’AVI mentionne notamment l’identité du bénéficiaire, l’établissement d’accueil, le montant effectivement reçu et affecté aux virements, la durée de l’engagement, le montant et la périodicité des virements ainsi que les références utiles de l’organisme émetteur.</p>`)}
  ${pied()}
</div>
<div class="page page-break">
  ${enTete()}
  ${article("6", "Délivrance de l’AVI", `<p>Le parcours de souscription est entièrement digitalisé. La demande d’AVI, le dépôt des pièces nécessaires, le suivi du dossier et la réception de l’AVI s’effectuent exclusivement dans l’application HCGF accessible depuis le site ${esc(SITE)}, à l’adresse app.hcgf.fr. Après validation, l’AVI est mise à disposition dans l’espace personnel du candidat, où il peut la consulter et la télécharger. Les éventuelles notifications par courriel ne se substituent pas à cette mise à disposition.</p><p>HCGF délivre l’AVI après validation du dossier, signature du contrat et encaissement irrévocable du montant total exigible. Le délai indicatif de traitement court à compter de la réunion de ces conditions. Il peut être prolongé en cas de contrôle réglementaire, de demande de pièces complémentaires ou d’incident imputable à un prestataire de paiement.</p>`)}
  ${article("7", "Obligations de l’Étudiant(e)", `<p>${Etudiant} fournit des informations exactes, complètes et à jour, notamment une copie du passeport, la lettre d’admission, les justificatifs de paiement et tout document relatif à l’origine des fonds. Il ou elle informe HCGF sans délai de toute modification affectant son dossier.</p><p>Après son arrivée ${esc(dest)}, ${etudiant} transmet à ${esc(EMAIL)} un RIB à son nom, une copie du visa, un justificatif d’entrée sur le territoire et l’AVI. Sous réserve de la réception d’un dossier complet, le premier virement est initié dans un délai maximal de quatre jours ouvrés, puis les virements suivants sont effectués mensuellement selon le calendrier communiqué.</p>`)}
  ${article("8", "Refus de visa et remboursement", `<p>En cas de refus de visa, ${etudiant} transmet à HCGF la notification officielle de refus, son AVI, une pièce d’identité et le RIB du payeur initial. Après vérification d’un dossier complet, HCGF restitue les fonds destinés aux virements mensuels dans un délai de dix jours ouvrés, par retour vers le compte d’origine lorsque cela est techniquement possible.</p><p>Les frais de prestation de ${esc(euros(FRAIS_PRESTATION))} rémunèrent l’instruction et le traitement du dossier et ne sont pas remboursables après délivrance de l’AVI, sauf disposition légale impérative contraire. Les frais bancaires, de change ou de paiement déjà supportés peuvent être déduits sur justificatif.</p>`)}
  ${article("9", "Rétractation et commencement anticipé", `<p>Lorsque le contrat est conclu à distance avec un consommateur, celui-ci bénéficie, lorsque la loi le prévoit, d’un délai de rétractation de quatorze jours. Si ${etudiant} demande expressément l’exécution du service avant l’expiration de ce délai, il ou elle reste redevable du montant correspondant aux prestations déjà exécutées. Le droit de rétractation peut être perdu après exécution complète du service si l’exécution a commencé avec son accord exprès et la reconnaissance de cette perte.</p>`)}
  ${pied()}
</div>
<div class="page page-break">
  ${enTete()}
  ${article("10", "Données personnelles", `<p>HCGF traite les données nécessaires à l’exécution du contrat, au suivi du dossier, à la sécurité des paiements et au respect de ses obligations légales. Les données peuvent être transmises aux prestataires strictement nécessaires à ces finalités et conservées pendant les durées légales applicables.</p><p>${Etudiant} peut exercer ses droits d’accès, de rectification, d’effacement, de limitation et, le cas échéant, d’opposition ou de portabilité en écrivant à ${esc(EMAIL)}. Il ou elle peut également saisir la CNIL.</p>`)}
  ${article("11", "Confidentialité", `<p>Chaque Partie s’engage à préserver la confidentialité des informations et documents reçus de l’autre Partie, sauf lorsque leur communication est nécessaire à l’exécution du contrat, imposée par la loi ou demandée par une autorité compétente.</p>`)}
  ${article("12", "Durée et résiliation", `<p>Le contrat prend effet à sa signature et s’achève après le dernier virement mensuel ou le remboursement des fonds en cas de refus de visa. En cas de manquement grave, l’autre Partie peut résilier le contrat quinze jours après une mise en demeure restée sans effet, sans préjudice des sommes dues et des dommages éventuellement réparables.</p>`)}
  ${article("13", "Réclamations et règlement des différends", `<p>Toute réclamation est adressée à HCGF, ${esc(ADRESSE)}, ou à ${esc(EMAIL)}. Les Parties recherchent d’abord une solution amiable. Les coordonnées du médiateur de la consommation compétent sont communiquées au client conformément aux règles applicables.</p><p>Le contrat est régi par le droit français. À défaut d’accord amiable, le litige relève des juridictions légalement compétentes, sans priver le consommateur des règles protectrices qui lui sont applicables.</p>`)}
  ${article("14", "Signature électronique", `<p>Les Parties acceptent la signature électronique et reconnaissent à celle-ci la même valeur probante qu’une signature manuscrite, sous réserve du respect des conditions légales applicables.</p>`)}
  <p class="ct-sign">${fait}</p>
  <table class="ct-boxes">
    <tr>
      <td>${blocEtudiant}</td>
      <td><strong>Pour HCGF</strong><br>${esc(PRESIDENTE)}, Présidente<br>Signature</td>
    </tr>
  </table>
  ${pied()}
</div>
</body></html>`;
}
