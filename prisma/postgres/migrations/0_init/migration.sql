-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "typeCompte" TEXT NOT NULL DEFAULT 'candidat',
    "role" TEXT NOT NULL DEFAULT '',
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "echecsConnexion" INTEGER NOT NULL DEFAULT 0,
    "verrouilleJusqua" TIMESTAMP(3),
    "mfaSecret" TEXT,
    "mfaActive" BOOLEAN NOT NULL DEFAULT false,
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idPartenaire" TEXT,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAuth" (
    "id" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "revoqueeAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementAuth" (
    "id" TEXT NOT NULL,
    "idUtilisateur" TEXT,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilCandidat" (
    "idUtilisateur" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "nationalite" TEXT,
    "paysResidence" TEXT,

    CONSTRAINT "ProfilCandidat_pkey" PRIMARY KEY ("idUtilisateur")
);

-- CreateTable
CREATE TABLE "Pays" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Pays_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Service" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OffreService" (
    "id" TEXT NOT NULL,
    "codePays" TEXT NOT NULL,
    "codeService" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "texteExplicatif" TEXT NOT NULL,
    "etapesParcours" TEXT NOT NULL,

    CONSTRAINT "OffreService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formulaire" (
    "id" TEXT NOT NULL,
    "idOffre" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Formulaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampFormulaire" (
    "id" TEXT NOT NULL,
    "idFormulaire" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "typeSaisie" TEXT NOT NULL,
    "obligatoire" BOOLEAN NOT NULL,
    "ordre" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "aide" TEXT,
    "optionsJson" TEXT,
    "conditionChamp" TEXT,
    "conditionOp" TEXT,
    "conditionValeur" TEXT,
    "prefillDepuis" TEXT,

    CONSTRAINT "ChampFormulaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceRequise" (
    "id" TEXT NOT NULL,
    "idOffre" TEXT NOT NULL,
    "typePiece" TEXT NOT NULL,
    "obligatoire" BOOLEAN NOT NULL,
    "ordreFusion" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "PieceRequise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demande" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "idOffre" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "priorite" TEXT NOT NULL DEFAULT 'normal',
    "pourcentageAvancement" INTEGER NOT NULL DEFAULT 0,
    "etapeCourante" TEXT NOT NULL DEFAULT 'formulaire',
    "dateDerniereActivite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idOrigine" TEXT,
    "idEtablissement" TEXT,
    "idPartenaire" TEXT,
    "slaCode" TEXT NOT NULL DEFAULT 'standard',
    "controleRenforce" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Demande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponseFormulaire" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idChamp" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "dateSaisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verrouillee" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReponseFormulaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemChecklist" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'a_venir',
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "ItemChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idPieceRequise" TEXT,
    "idAuteur" TEXT,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "hash" TEXT NOT NULL DEFAULT '',
    "statut" TEXT NOT NULL DEFAULT 'recu',
    "origine" TEXT NOT NULL DEFAULT 'candidat',
    "ocrStatut" TEXT NOT NULL DEFAULT '',
    "ocrTexte" TEXT NOT NULL DEFAULT '',
    "ocrJson" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "idConversation" TEXT NOT NULL,
    "idAuteur" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "idDemande" TEXT,
    "evenement" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'non_lue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheInterne" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idAssignee" TEXT,
    "action" TEXT NOT NULL,
    "priorite" TEXT NOT NULL DEFAULT 'normal',
    "statut" TEXT NOT NULL DEFAULT 'a_faire',
    "dateEcheance" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TacheInterne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "idActeur" TEXT,
    "action" TEXT NOT NULL,
    "objetType" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    "idDemande" TEXT,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JetonVerification" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idDocument" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'valide',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JetonReinitialisation" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "utiliseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonReinitialisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "idDocument" TEXT NOT NULL,
    "idSignataire" TEXT NOT NULL,
    "dateSignature" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaremeTarifaire" (
    "id" TEXT NOT NULL,
    "idOffre" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "frais" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateEffet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaremeTarifaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifApplique" (
    "idDemande" TEXT NOT NULL,
    "idBareme" TEXT NOT NULL,
    "montantAccepte" INTEGER NOT NULL,
    "frais" INTEGER NOT NULL,
    "versionBareme" TEXT NOT NULL,
    "dateAcceptation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarifApplique_pkey" PRIMARY KEY ("idDemande")
);

-- CreateTable
CREATE TABLE "EspaceFinancier" (
    "idDemande" TEXT NOT NULL,
    "montantAttendu" INTEGER NOT NULL,
    "montantRecu" INTEGER NOT NULL DEFAULT 0,
    "frais" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "statutFonds" TEXT NOT NULL DEFAULT 'en_attente',

    CONSTRAINT "EspaceFinancier_pkey" PRIMARY KEY ("idDemande")
);

-- CreateTable
CREATE TABLE "OperationFinanciere" (
    "id" TEXT NOT NULL,
    "idEspace" TEXT NOT NULL,
    "idRemboursement" TEXT,
    "type" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "reference" TEXT NOT NULL DEFAULT '',
    "idTransaction" TEXT NOT NULL DEFAULT '',
    "cleIdempotence" TEXT,
    "iban" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationFinanciere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeRemboursement" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "coordonnees" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'recue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeRemboursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceComptable" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storagePath" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "PieceComptable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormuleAssurance" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplement" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormuleAssurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garantie" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "plafond" TEXT NOT NULL,

    CONSTRAINT "Garantie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantieFormule" (
    "idFormule" TEXT NOT NULL,
    "idGarantie" TEXT NOT NULL,

    CONSTRAINT "GarantieFormule_pkey" PRIMARY KEY ("idFormule","idGarantie")
);

-- CreateTable
CREATE TABLE "PoliceAssurance" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idFormule" TEXT NOT NULL,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT NOT NULL,
    "idExterne" TEXT NOT NULL DEFAULT '',
    "statut" TEXT NOT NULL DEFAULT 'tarifee',
    "storagePath" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliceAssurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationVol" (
    "id" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "idDemande" TEXT,
    "offreCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'AVI-AIR',
    "providerOrderId" TEXT NOT NULL DEFAULT '',
    "bookingReference" TEXT NOT NULL DEFAULT '',
    "airlineName" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentRequiredBy" TIMESTAMP(3),
    "priceGuaranteeExpiresAt" TIMESTAMP(3),
    "requiresInstantPayment" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "cleIdempotence" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'SEARCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationVol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentVol" (
    "id" TEXT NOT NULL,
    "idReservation" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "aeroportDepart" TEXT NOT NULL,
    "aeroportArrivee" TEXT NOT NULL,
    "depart" TEXT NOT NULL,
    "arrivee" TEXT NOT NULL,
    "transporteurCommercial" TEXT NOT NULL,
    "transporteurOperant" TEXT NOT NULL,
    "classe" TEXT NOT NULL DEFAULT 'M',
    "escales" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SegmentVol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassagerVol" (
    "id" TEXT NOT NULL,
    "idReservation" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TEXT NOT NULL,
    "sexe" TEXT NOT NULL DEFAULT '',
    "nationalite" TEXT NOT NULL DEFAULT '',
    "documentVoyage" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PassagerVol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JustificatifVol" (
    "idReservation" TEXT NOT NULL,
    "mention" TEXT NOT NULL,
    "dateGeneration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storagePath" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "JustificatifVol_pkey" PRIMARY KEY ("idReservation")
);

-- CreateTable
CREATE TABLE "Bailleur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "coordonnees" TEXT NOT NULL,
    "statutValidation" TEXT NOT NULL DEFAULT 'valide',

    CONSTRAINT "Bailleur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logement" (
    "id" TEXT NOT NULL,
    "idBailleur" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'disponible',
    "dateDisponibilite" TEXT NOT NULL,

    CONSTRAINT "Logement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matching" (
    "id" TEXT NOT NULL,
    "idEtablissement" TEXT NOT NULL,
    "idLogement" TEXT NOT NULL,
    "dureeVoitureMin" INTEGER NOT NULL,
    "dureeTransportMin" INTEGER NOT NULL,
    "heureReference" TEXT NOT NULL DEFAULT '08:30',
    "statut" TEXT NOT NULL,
    "dateCalcul" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Matching_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affectation" (
    "idDemande" TEXT NOT NULL,
    "idLogement" TEXT NOT NULL,
    "dateChoix" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'choisi',

    CONSTRAINT "Affectation_pkey" PRIMARY KEY ("idDemande")
);

-- CreateTable
CREATE TABLE "ListeAttente" (
    "idDemande" TEXT NOT NULL,
    "criteres" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'inscrit',
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeAttente_pkey" PRIMARY KEY ("idDemande")
);

-- CreateTable
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'actif',

    CONSTRAINT "Partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegleCommission" (
    "id" TEXT NOT NULL,
    "idPartenaire" TEXT NOT NULL,
    "taux" INTEGER NOT NULL DEFAULT 0,
    "montantFixe" INTEGER NOT NULL DEFAULT 0,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RegleCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idRegleCommission" TEXT NOT NULL,
    "montantCalcule" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'calculee',
    "datePaiement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentContractuel" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "numeroVersion" TEXT NOT NULL,
    "datePublication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentContractuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acceptation" (
    "id" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "idDocumentContractuel" TEXT NOT NULL,
    "idDemande" TEXT,
    "dateAcceptation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adresseIp" TEXT NOT NULL DEFAULT '',
    "preuve" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Acceptation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "idMandant" TEXT NOT NULL,
    "idMandataire" TEXT NOT NULL,
    "idDemande" TEXT,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'active',
    "motifRevocation" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegationDroit" (
    "idDelegation" TEXT NOT NULL,
    "codeDroit" TEXT NOT NULL,

    CONSTRAINT "DelegationDroit_pkey" PRIMARY KEY ("idDelegation","codeDroit")
);

-- CreateTable
CREATE TABLE "ConfigSla" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "delaiHeures" INTEGER NOT NULL,
    "supplement" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConfigSla_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "RegleRelance" (
    "id" TEXT NOT NULL,
    "delaiJours" INTEGER NOT NULL,
    "typeRelance" TEXT NOT NULL,
    "creerTache" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RegleRelance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relance" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idRegle" TEXT NOT NULL,
    "datePrevue" TIMESTAMP(3) NOT NULL,
    "dateEnvoi" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'planifiee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Echeance" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "alerteGeneree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Echeance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reclamation" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idAuteur" TEXT NOT NULL,
    "idResponsable" TEXT,
    "categorie" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "priorite" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageSav" (
    "id" TEXT NOT NULL,
    "idReclamation" TEXT NOT NULL,
    "idAuteur" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageSav_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FournisseurExterne" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FournisseurExterne_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OperationApi" (
    "id" TEXT NOT NULL,
    "codeFournisseur" TEXT NOT NULL,
    "idDemande" TEXT,
    "action" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "cleIdempotence" TEXT NOT NULL,
    "nbTentatives" INTEGER NOT NULL DEFAULT 0,
    "derniereErreur" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativeApi" (
    "id" TEXT NOT NULL,
    "idOperation" TEXT NOT NULL,
    "dateTentative" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codeHttp" INTEGER NOT NULL DEFAULT 0,
    "reponse" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TentativeApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlerteFraude" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idDocument" TEXT,
    "typeSignal" TEXT NOT NULL,
    "niveau" TEXT NOT NULL DEFAULT 'moyen',
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "detail" TEXT NOT NULL,
    "idActeurTraitement" TEXT,
    "traiteAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlerteFraude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoubleValidation" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "typeOperation" TEXT NOT NULL,
    "idVerificateur" TEXT NOT NULL,
    "idValidateur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'verifie',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoubleValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretInterne" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretInterne_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "SessionAuth_idUtilisateur_idx" ON "SessionAuth"("idUtilisateur");

-- CreateIndex
CREATE INDEX "SessionAuth_expireAt_idx" ON "SessionAuth"("expireAt");

-- CreateIndex
CREATE INDEX "EvenementAuth_email_createdAt_idx" ON "EvenementAuth"("email", "createdAt");

-- CreateIndex
CREATE INDEX "EvenementAuth_ip_createdAt_idx" ON "EvenementAuth"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OffreService_codePays_codeService_key" ON "OffreService"("codePays", "codeService");

-- CreateIndex
CREATE UNIQUE INDEX "Formulaire_idOffre_key" ON "Formulaire"("idOffre");

-- CreateIndex
CREATE UNIQUE INDEX "Demande_reference_key" ON "Demande"("reference");

-- CreateIndex
CREATE INDEX "Demande_idUtilisateur_idx" ON "Demande"("idUtilisateur");

-- CreateIndex
CREATE INDEX "Demande_statut_dateDerniereActivite_idx" ON "Demande"("statut", "dateDerniereActivite");

-- CreateIndex
CREATE INDEX "Demande_idOffre_idx" ON "Demande"("idOffre");

-- CreateIndex
CREATE INDEX "Demande_idPartenaire_idx" ON "Demande"("idPartenaire");

-- CreateIndex
CREATE UNIQUE INDEX "ReponseFormulaire_idDemande_idChamp_key" ON "ReponseFormulaire"("idDemande", "idChamp");

-- CreateIndex
CREATE INDEX "ItemChecklist_idDemande_idx" ON "ItemChecklist"("idDemande");

-- CreateIndex
CREATE INDEX "Document_hash_idx" ON "Document"("hash");

-- CreateIndex
CREATE INDEX "Document_idDemande_idx" ON "Document"("idDemande");

-- CreateIndex
CREATE INDEX "Document_idAuteur_idx" ON "Document"("idAuteur");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_idDemande_key" ON "Conversation"("idDemande");

-- CreateIndex
CREATE INDEX "Message_idConversation_idx" ON "Message"("idConversation");

-- CreateIndex
CREATE INDEX "Notification_idUtilisateur_statut_idx" ON "Notification"("idUtilisateur", "statut");

-- CreateIndex
CREATE INDEX "Notification_idDemande_idx" ON "Notification"("idDemande");

-- CreateIndex
CREATE INDEX "TacheInterne_idDemande_idx" ON "TacheInterne"("idDemande");

-- CreateIndex
CREATE INDEX "TacheInterne_statut_idx" ON "TacheInterne"("statut");

-- CreateIndex
CREATE INDEX "TacheInterne_idAssignee_idx" ON "TacheInterne"("idAssignee");

-- CreateIndex
CREATE INDEX "JournalAudit_idDemande_idx" ON "JournalAudit"("idDemande");

-- CreateIndex
CREATE INDEX "JournalAudit_createdAt_idx" ON "JournalAudit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JetonVerification_token_key" ON "JetonVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "JetonReinitialisation_token_key" ON "JetonReinitialisation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OperationFinanciere_cleIdempotence_key" ON "OperationFinanciere"("cleIdempotence");

-- CreateIndex
CREATE UNIQUE INDEX "PieceComptable_numero_key" ON "PieceComptable"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "FormuleAssurance_code_key" ON "FormuleAssurance"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Garantie_code_key" ON "Garantie"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PoliceAssurance_idDemande_key" ON "PoliceAssurance"("idDemande");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationVol_cleIdempotence_key" ON "ReservationVol"("cleIdempotence");

-- CreateIndex
CREATE UNIQUE INDEX "Matching_idEtablissement_idLogement_key" ON "Matching"("idEtablissement", "idLogement");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_idDemande_key" ON "Commission"("idDemande");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentContractuel_type_numeroVersion_key" ON "DocumentContractuel"("type", "numeroVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Relance_idDemande_idRegle_key" ON "Relance"("idDemande", "idRegle");

-- CreateIndex
CREATE UNIQUE INDEX "Reclamation_numero_key" ON "Reclamation"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "OperationApi_cleIdempotence_key" ON "OperationApi"("cleIdempotence");

-- CreateIndex
CREATE INDEX "OperationApi_statut_idx" ON "OperationApi"("statut");

-- CreateIndex
CREATE INDEX "AlerteFraude_idDemande_statut_idx" ON "AlerteFraude"("idDemande", "statut");

-- CreateIndex
CREATE INDEX "AlerteFraude_typeSignal_statut_idx" ON "AlerteFraude"("typeSignal", "statut");

-- CreateIndex
CREATE INDEX "AlerteFraude_idDocument_idx" ON "AlerteFraude"("idDocument");

-- CreateIndex
CREATE INDEX "DoubleValidation_idDemande_typeOperation_idx" ON "DoubleValidation"("idDemande", "typeOperation");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAuth" ADD CONSTRAINT "SessionAuth_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvenementAuth" ADD CONSTRAINT "EvenementAuth_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilCandidat" ADD CONSTRAINT "ProfilCandidat_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreService" ADD CONSTRAINT "OffreService_codePays_fkey" FOREIGN KEY ("codePays") REFERENCES "Pays"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreService" ADD CONSTRAINT "OffreService_codeService_fkey" FOREIGN KEY ("codeService") REFERENCES "Service"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formulaire" ADD CONSTRAINT "Formulaire_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampFormulaire" ADD CONSTRAINT "ChampFormulaire_idFormulaire_fkey" FOREIGN KEY ("idFormulaire") REFERENCES "Formulaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceRequise" ADD CONSTRAINT "PieceRequise_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_idOrigine_fkey" FOREIGN KEY ("idOrigine") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseFormulaire" ADD CONSTRAINT "ReponseFormulaire_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseFormulaire" ADD CONSTRAINT "ReponseFormulaire_idChamp_fkey" FOREIGN KEY ("idChamp") REFERENCES "ChampFormulaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemChecklist" ADD CONSTRAINT "ItemChecklist_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_idPieceRequise_fkey" FOREIGN KEY ("idPieceRequise") REFERENCES "PieceRequise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_idAuteur_fkey" FOREIGN KEY ("idAuteur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_idConversation_fkey" FOREIGN KEY ("idConversation") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_idAuteur_fkey" FOREIGN KEY ("idAuteur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheInterne" ADD CONSTRAINT "TacheInterne_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheInterne" ADD CONSTRAINT "TacheInterne_idAssignee_fkey" FOREIGN KEY ("idAssignee") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_idActeur_fkey" FOREIGN KEY ("idActeur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JetonVerification" ADD CONSTRAINT "JetonVerification_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JetonVerification" ADD CONSTRAINT "JetonVerification_idDocument_fkey" FOREIGN KEY ("idDocument") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JetonReinitialisation" ADD CONSTRAINT "JetonReinitialisation_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_idDocument_fkey" FOREIGN KEY ("idDocument") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_idSignataire_fkey" FOREIGN KEY ("idSignataire") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaremeTarifaire" ADD CONSTRAINT "BaremeTarifaire_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifApplique" ADD CONSTRAINT "TarifApplique_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifApplique" ADD CONSTRAINT "TarifApplique_idBareme_fkey" FOREIGN KEY ("idBareme") REFERENCES "BaremeTarifaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspaceFinancier" ADD CONSTRAINT "EspaceFinancier_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinanciere" ADD CONSTRAINT "OperationFinanciere_idEspace_fkey" FOREIGN KEY ("idEspace") REFERENCES "EspaceFinancier"("idDemande") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinanciere" ADD CONSTRAINT "OperationFinanciere_idRemboursement_fkey" FOREIGN KEY ("idRemboursement") REFERENCES "DemandeRemboursement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeRemboursement" ADD CONSTRAINT "DemandeRemboursement_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceComptable" ADD CONSTRAINT "PieceComptable_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantieFormule" ADD CONSTRAINT "GarantieFormule_idFormule_fkey" FOREIGN KEY ("idFormule") REFERENCES "FormuleAssurance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantieFormule" ADD CONSTRAINT "GarantieFormule_idGarantie_fkey" FOREIGN KEY ("idGarantie") REFERENCES "Garantie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceAssurance" ADD CONSTRAINT "PoliceAssurance_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceAssurance" ADD CONSTRAINT "PoliceAssurance_idFormule_fkey" FOREIGN KEY ("idFormule") REFERENCES "FormuleAssurance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationVol" ADD CONSTRAINT "ReservationVol_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationVol" ADD CONSTRAINT "ReservationVol_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentVol" ADD CONSTRAINT "SegmentVol_idReservation_fkey" FOREIGN KEY ("idReservation") REFERENCES "ReservationVol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassagerVol" ADD CONSTRAINT "PassagerVol_idReservation_fkey" FOREIGN KEY ("idReservation") REFERENCES "ReservationVol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificatifVol" ADD CONSTRAINT "JustificatifVol_idReservation_fkey" FOREIGN KEY ("idReservation") REFERENCES "ReservationVol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logement" ADD CONSTRAINT "Logement_idBailleur_fkey" FOREIGN KEY ("idBailleur") REFERENCES "Bailleur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matching" ADD CONSTRAINT "Matching_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matching" ADD CONSTRAINT "Matching_idLogement_fkey" FOREIGN KEY ("idLogement") REFERENCES "Logement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_idLogement_fkey" FOREIGN KEY ("idLogement") REFERENCES "Logement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeAttente" ADD CONSTRAINT "ListeAttente_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegleCommission" ADD CONSTRAINT "RegleCommission_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_idRegleCommission_fkey" FOREIGN KEY ("idRegleCommission") REFERENCES "RegleCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceptation" ADD CONSTRAINT "Acceptation_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceptation" ADD CONSTRAINT "Acceptation_idDocumentContractuel_fkey" FOREIGN KEY ("idDocumentContractuel") REFERENCES "DocumentContractuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceptation" ADD CONSTRAINT "Acceptation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_idMandant_fkey" FOREIGN KEY ("idMandant") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_idMandataire_fkey" FOREIGN KEY ("idMandataire") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationDroit" ADD CONSTRAINT "DelegationDroit_idDelegation_fkey" FOREIGN KEY ("idDelegation") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_idRegle_fkey" FOREIGN KEY ("idRegle") REFERENCES "RegleRelance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_idAuteur_fkey" FOREIGN KEY ("idAuteur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_idResponsable_fkey" FOREIGN KEY ("idResponsable") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageSav" ADD CONSTRAINT "MessageSav_idReclamation_fkey" FOREIGN KEY ("idReclamation") REFERENCES "Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageSav" ADD CONSTRAINT "MessageSav_idAuteur_fkey" FOREIGN KEY ("idAuteur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationApi" ADD CONSTRAINT "OperationApi_codeFournisseur_fkey" FOREIGN KEY ("codeFournisseur") REFERENCES "FournisseurExterne"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationApi" ADD CONSTRAINT "OperationApi_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativeApi" ADD CONSTRAINT "TentativeApi_idOperation_fkey" FOREIGN KEY ("idOperation") REFERENCES "OperationApi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlerteFraude" ADD CONSTRAINT "AlerteFraude_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlerteFraude" ADD CONSTRAINT "AlerteFraude_idDocument_fkey" FOREIGN KEY ("idDocument") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubleValidation" ADD CONSTRAINT "DoubleValidation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubleValidation" ADD CONSTRAINT "DoubleValidation_idVerificateur_fkey" FOREIGN KEY ("idVerificateur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubleValidation" ADD CONSTRAINT "DoubleValidation_idValidateur_fkey" FOREIGN KEY ("idValidateur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

