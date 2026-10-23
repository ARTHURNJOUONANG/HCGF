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

const TABLE = {
  terminerIntro: authActions.terminerIntro,
  inscrire: authActions.inscrire,
  connecter: authActions.connecter,
  deconnecter: authActions.deconnecter,
  creerDemande: authActions.creerDemande,
  sauvegarderReponses: authActions.sauvegarderReponses,
  deposerDocument: lot2.deposerDocument,
  controlerDocument: lot2.controlerDocument,
  envoyerMessage: lot2.envoyerMessage,
  creerTache: lot2.creerTache,
  terminerTache: lot2.terminerTache,
  signerEtValider: lot2.signerEtValider,
  marquerNotificationsLues: lot2.marquerNotificationsLues,
  leverAlerteFraudeAction: lot2.leverAlerteFraudeAction,
  confirmerAlerteFraudeAction: lot2.confirmerAlerteFraudeAction,
  analyserFraudeAction: lot2.analyserFraudeAction,
  abandonnerDemande: lot2.abandonnerDemande,
  cloturerDemande: lot2.cloturerDemande,
  payerParMoyen: lot3.payerParMoyen,
  declarerVirement: lot3.declarerVirement,
  rapprocherVirement: lot3.rapprocherVirement,
  demanderRemboursement: lot3.demanderRemboursement,
  traiterRemboursement: lot3.traiterRemboursement,
  initierDossierPartenaire: lot5.initierDossierPartenaire,
  payerCommission: lot5.payerCommission,
  ouvrirDelegation: lot6.ouvrirDelegation,
  revoquerDelegation: lot6.revoquerDelegation,
  changerPriorite: lot8.changerPriorite,
  executerRelances: lot8.executerRelances,
  ouvrirReclamation: lot8.ouvrirReclamation,
  ecrireMessageSav: lot8.ecrireMessageSav,
  changerStatutReclamation: lot8.changerStatutReclamation,
  signerContratAvi: contrat.signerContratAvi,
  ouvrirAssuranceDepuisAvi: metier.ouvrirAssuranceDepuisAvi,
  souscrirePolice: metier.souscrirePolice,
  emettreAttestationAssurance: metier.emettreAttestationAssurance,
  poserHold: metier.poserHold,
  emettreJustificatifVol: metier.emettreJustificatifVol,
  payerBilletVol: metier.payerBilletVol,
  lancerMatching: metier.lancerMatching,
  choisirLogement: metier.choisirLogement,
  inscrireListeAttente: metier.inscrireListeAttente,
  revoquerAutresSessions: rgpd.revoquerAutresSessions,
  fermerMonCompte: rgpd.fermerMonCompte,
  creerCollaborateur: equipe.creerCollaborateur,
  creerComptePartenaire: equipe.creerComptePartenaire,
  demanderReinitialisation: mdp.demanderReinitialisation,
  definirNouveauMotDePasse: mdp.definirNouveauMotDePasse,
} as const;

export type ActionName = keyof typeof TABLE;

export async function runAction(name: ActionName, ...args: unknown[]) {
  const fn = TABLE[name] as (...params: unknown[]) => unknown;
  return fn(...args);
}
