import { runAction, type ActionTable } from "./server-actions";

// runAction est l’unique server action exposée (plan Vercel Hobby).
// Le cast restitue à chaque action liée la signature de sa fonction métier.

/** Adapte une action qui renvoie un résultat à l’attribut <form action>. */
export function enActionFormulaire(action: (formData: FormData) => Promise<unknown>) {
  return action as unknown as (formData: FormData) => Promise<void>;
}

export const terminerIntro = runAction.bind(null, "terminerIntro") as unknown as ActionTable["terminerIntro"];
export const inscrire = runAction.bind(null, "inscrire") as unknown as ActionTable["inscrire"];
export const connecter = runAction.bind(null, "connecter") as unknown as ActionTable["connecter"];
export const deconnecter = runAction.bind(null, "deconnecter") as unknown as ActionTable["deconnecter"];
export const creerDemande = runAction.bind(null, "creerDemande") as unknown as ActionTable["creerDemande"];
export const sauvegarderReponses = runAction.bind(null, "sauvegarderReponses") as unknown as ActionTable["sauvegarderReponses"];
export const deposerDocument = runAction.bind(null, "deposerDocument") as unknown as ActionTable["deposerDocument"];
export const controlerDocument = runAction.bind(null, "controlerDocument") as unknown as ActionTable["controlerDocument"];
export const envoyerMessage = runAction.bind(null, "envoyerMessage") as unknown as ActionTable["envoyerMessage"];
export const creerTache = runAction.bind(null, "creerTache") as unknown as ActionTable["creerTache"];
export const terminerTache = runAction.bind(null, "terminerTache") as unknown as ActionTable["terminerTache"];
export const signerEtValider = runAction.bind(null, "signerEtValider") as unknown as ActionTable["signerEtValider"];
export const marquerNotificationsLues = runAction.bind(null, "marquerNotificationsLues") as unknown as ActionTable["marquerNotificationsLues"];
export const leverAlerteFraudeAction = runAction.bind(null, "leverAlerteFraudeAction") as unknown as ActionTable["leverAlerteFraudeAction"];
export const confirmerAlerteFraudeAction = runAction.bind(null, "confirmerAlerteFraudeAction") as unknown as ActionTable["confirmerAlerteFraudeAction"];
export const analyserFraudeAction = runAction.bind(null, "analyserFraudeAction") as unknown as ActionTable["analyserFraudeAction"];
export const abandonnerDemande = runAction.bind(null, "abandonnerDemande") as unknown as ActionTable["abandonnerDemande"];
export const cloturerDemande = runAction.bind(null, "cloturerDemande") as unknown as ActionTable["cloturerDemande"];
export const payerParMoyen = runAction.bind(null, "payerParMoyen") as unknown as ActionTable["payerParMoyen"];
export const declarerVirement = runAction.bind(null, "declarerVirement") as unknown as ActionTable["declarerVirement"];
export const rapprocherVirement = runAction.bind(null, "rapprocherVirement") as unknown as ActionTable["rapprocherVirement"];
export const demanderRemboursement = runAction.bind(null, "demanderRemboursement") as unknown as ActionTable["demanderRemboursement"];
export const traiterRemboursement = runAction.bind(null, "traiterRemboursement") as unknown as ActionTable["traiterRemboursement"];
export const initierDossierPartenaire = runAction.bind(null, "initierDossierPartenaire") as unknown as ActionTable["initierDossierPartenaire"];
export const payerCommission = runAction.bind(null, "payerCommission") as unknown as ActionTable["payerCommission"];
export const ouvrirDelegation = runAction.bind(null, "ouvrirDelegation") as unknown as ActionTable["ouvrirDelegation"];
export const revoquerDelegation = runAction.bind(null, "revoquerDelegation") as unknown as ActionTable["revoquerDelegation"];
export const changerPriorite = runAction.bind(null, "changerPriorite") as unknown as ActionTable["changerPriorite"];
export const executerRelances = runAction.bind(null, "executerRelances") as unknown as ActionTable["executerRelances"];
export const ouvrirReclamation = runAction.bind(null, "ouvrirReclamation") as unknown as ActionTable["ouvrirReclamation"];
export const ecrireMessageSav = runAction.bind(null, "ecrireMessageSav") as unknown as ActionTable["ecrireMessageSav"];
export const changerStatutReclamation = runAction.bind(null, "changerStatutReclamation") as unknown as ActionTable["changerStatutReclamation"];
export const signerContratAvi = runAction.bind(null, "signerContratAvi") as unknown as ActionTable["signerContratAvi"];
export const ouvrirAssuranceDepuisAvi = runAction.bind(null, "ouvrirAssuranceDepuisAvi") as unknown as ActionTable["ouvrirAssuranceDepuisAvi"];
export const souscrirePolice = runAction.bind(null, "souscrirePolice") as unknown as ActionTable["souscrirePolice"];
export const emettreAttestationAssurance = runAction.bind(null, "emettreAttestationAssurance") as unknown as ActionTable["emettreAttestationAssurance"];
export const poserHold = runAction.bind(null, "poserHold") as unknown as ActionTable["poserHold"];
export const emettreJustificatifVol = runAction.bind(null, "emettreJustificatifVol") as unknown as ActionTable["emettreJustificatifVol"];
export const payerBilletVol = runAction.bind(null, "payerBilletVol") as unknown as ActionTable["payerBilletVol"];
export const lancerMatching = runAction.bind(null, "lancerMatching") as unknown as ActionTable["lancerMatching"];
export const choisirLogement = runAction.bind(null, "choisirLogement") as unknown as ActionTable["choisirLogement"];
export const inscrireListeAttente = runAction.bind(null, "inscrireListeAttente") as unknown as ActionTable["inscrireListeAttente"];
export const revoquerAutresSessions = runAction.bind(null, "revoquerAutresSessions") as unknown as ActionTable["revoquerAutresSessions"];
export const fermerMonCompte = runAction.bind(null, "fermerMonCompte") as unknown as ActionTable["fermerMonCompte"];
export const creerCollaborateur = runAction.bind(null, "creerCollaborateur") as unknown as ActionTable["creerCollaborateur"];
export const creerComptePartenaire = runAction.bind(null, "creerComptePartenaire") as unknown as ActionTable["creerComptePartenaire"];
export const demanderReinitialisation = runAction.bind(null, "demanderReinitialisation") as unknown as ActionTable["demanderReinitialisation"];
export const definirNouveauMotDePasse = runAction.bind(null, "definirNouveauMotDePasse") as unknown as ActionTable["definirNouveauMotDePasse"];
