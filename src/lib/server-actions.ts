"use server";

import * as authActions from "./actions";
import * as lot2 from "./lot2";
import * as lot3 from "./lot3";
import * as lot5 from "./lot5";
import * as lot6 from "./lot6";
import * as lot8 from "./lot8";
import * as contrat from "./lot-contrat";
import * as metier from "./services-metier";
import * as rgpd from "./rgpd-actions";
import * as equipe from "./equipe";
import * as mdp from "./mot-de-passe";

export async function terminerIntro(...args: Parameters<typeof authActions.terminerIntro>) {
  return authActions.terminerIntro(...args);
}
export async function inscrire(...args: Parameters<typeof authActions.inscrire>) {
  return authActions.inscrire(...args);
}
export async function connecter(...args: Parameters<typeof authActions.connecter>) {
  return authActions.connecter(...args);
}
export async function deconnecter() {
  return authActions.deconnecter();
}
export async function creerDemande(...args: Parameters<typeof authActions.creerDemande>) {
  return authActions.creerDemande(...args);
}
export async function sauvegarderReponses(...args: Parameters<typeof authActions.sauvegarderReponses>) {
  return authActions.sauvegarderReponses(...args);
}

export async function deposerDocument(...args: Parameters<typeof lot2.deposerDocument>) {
  return lot2.deposerDocument(...args);
}
export async function controlerDocument(...args: Parameters<typeof lot2.controlerDocument>) {
  return lot2.controlerDocument(...args);
}
export async function envoyerMessage(...args: Parameters<typeof lot2.envoyerMessage>) {
  return lot2.envoyerMessage(...args);
}
export async function creerTache(...args: Parameters<typeof lot2.creerTache>) {
  return lot2.creerTache(...args);
}
export async function terminerTache(...args: Parameters<typeof lot2.terminerTache>) {
  return lot2.terminerTache(...args);
}
export async function signerEtValider(...args: Parameters<typeof lot2.signerEtValider>) {
  return lot2.signerEtValider(...args);
}
export async function marquerNotificationsLues() {
  return lot2.marquerNotificationsLues();
}
export async function leverAlerteFraudeAction(...args: Parameters<typeof lot2.leverAlerteFraudeAction>) {
  return lot2.leverAlerteFraudeAction(...args);
}
export async function confirmerAlerteFraudeAction(...args: Parameters<typeof lot2.confirmerAlerteFraudeAction>) {
  return lot2.confirmerAlerteFraudeAction(...args);
}
export async function analyserFraudeAction(...args: Parameters<typeof lot2.analyserFraudeAction>) {
  return lot2.analyserFraudeAction(...args);
}
export async function abandonnerDemande(...args: Parameters<typeof lot2.abandonnerDemande>) {
  return lot2.abandonnerDemande(...args);
}
export async function cloturerDemande(...args: Parameters<typeof lot2.cloturerDemande>) {
  return lot2.cloturerDemande(...args);
}

export async function payerParMoyen(...args: Parameters<typeof lot3.payerParMoyen>) {
  return lot3.payerParMoyen(...args);
}
export async function declarerVirement(...args: Parameters<typeof lot3.declarerVirement>) {
  return lot3.declarerVirement(...args);
}
export async function rapprocherVirement(...args: Parameters<typeof lot3.rapprocherVirement>) {
  return lot3.rapprocherVirement(...args);
}
export async function demanderRemboursement(...args: Parameters<typeof lot3.demanderRemboursement>) {
  return lot3.demanderRemboursement(...args);
}
export async function traiterRemboursement(...args: Parameters<typeof lot3.traiterRemboursement>) {
  return lot3.traiterRemboursement(...args);
}

export async function initierDossierPartenaire(...args: Parameters<typeof lot5.initierDossierPartenaire>) {
  return lot5.initierDossierPartenaire(...args);
}
export async function payerCommission(...args: Parameters<typeof lot5.payerCommission>) {
  return lot5.payerCommission(...args);
}

export async function ouvrirDelegation(...args: Parameters<typeof lot6.ouvrirDelegation>) {
  return lot6.ouvrirDelegation(...args);
}
export async function revoquerDelegation(...args: Parameters<typeof lot6.revoquerDelegation>) {
  return lot6.revoquerDelegation(...args);
}

export async function changerPriorite(...args: Parameters<typeof lot8.changerPriorite>) {
  return lot8.changerPriorite(...args);
}
export async function executerRelances() {
  return lot8.executerRelances();
}
export async function ouvrirReclamation(...args: Parameters<typeof lot8.ouvrirReclamation>) {
  return lot8.ouvrirReclamation(...args);
}
export async function ecrireMessageSav(...args: Parameters<typeof lot8.ecrireMessageSav>) {
  return lot8.ecrireMessageSav(...args);
}
export async function changerStatutReclamation(...args: Parameters<typeof lot8.changerStatutReclamation>) {
  return lot8.changerStatutReclamation(...args);
}

export async function signerContratAvi(...args: Parameters<typeof contrat.signerContratAvi>) {
  return contrat.signerContratAvi(...args);
}

export async function ouvrirAssuranceDepuisAvi(...args: Parameters<typeof metier.ouvrirAssuranceDepuisAvi>) {
  return metier.ouvrirAssuranceDepuisAvi(...args);
}
export async function souscrirePolice(...args: Parameters<typeof metier.souscrirePolice>) {
  return metier.souscrirePolice(...args);
}
export async function emettreAttestationAssurance(...args: Parameters<typeof metier.emettreAttestationAssurance>) {
  return metier.emettreAttestationAssurance(...args);
}
export async function poserHold(...args: Parameters<typeof metier.poserHold>) {
  return metier.poserHold(...args);
}
export async function emettreJustificatifVol(...args: Parameters<typeof metier.emettreJustificatifVol>) {
  return metier.emettreJustificatifVol(...args);
}
export async function payerBilletVol(...args: Parameters<typeof metier.payerBilletVol>) {
  return metier.payerBilletVol(...args);
}
export async function lancerMatching(...args: Parameters<typeof metier.lancerMatching>) {
  return metier.lancerMatching(...args);
}
export async function choisirLogement(...args: Parameters<typeof metier.choisirLogement>) {
  return metier.choisirLogement(...args);
}
export async function inscrireListeAttente(...args: Parameters<typeof metier.inscrireListeAttente>) {
  return metier.inscrireListeAttente(...args);
}

export async function revoquerAutresSessions() {
  return rgpd.revoquerAutresSessions();
}
export async function fermerMonCompte(...args: Parameters<typeof rgpd.fermerMonCompte>) {
  return rgpd.fermerMonCompte(...args);
}

export async function creerCollaborateur(...args: Parameters<typeof equipe.creerCollaborateur>) {
  return equipe.creerCollaborateur(...args);
}
export async function creerComptePartenaire(...args: Parameters<typeof equipe.creerComptePartenaire>) {
  return equipe.creerComptePartenaire(...args);
}

export async function demanderReinitialisation(...args: Parameters<typeof mdp.demanderReinitialisation>) {
  return mdp.demanderReinitialisation(...args);
}
export async function definirNouveauMotDePasse(...args: Parameters<typeof mdp.definirNouveauMotDePasse>) {
  return mdp.definirNouveauMotDePasse(...args);
}
