-- CreateTable
CREATE TABLE "FormuleAssurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplement" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Garantie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "plafond" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GarantieFormule" (
    "idFormule" TEXT NOT NULL,
    "idGarantie" TEXT NOT NULL,

    PRIMARY KEY ("idFormule", "idGarantie"),
    CONSTRAINT "GarantieFormule_idFormule_fkey" FOREIGN KEY ("idFormule") REFERENCES "FormuleAssurance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GarantieFormule_idGarantie_fkey" FOREIGN KEY ("idGarantie") REFERENCES "Garantie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PoliceAssurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "idFormule" TEXT NOT NULL,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT NOT NULL,
    "idExterne" TEXT NOT NULL DEFAULT '',
    "statut" TEXT NOT NULL DEFAULT 'tarifee',
    "storagePath" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoliceAssurance_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PoliceAssurance_idFormule_fkey" FOREIGN KEY ("idFormule") REFERENCES "FormuleAssurance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationVol" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idUtilisateur" TEXT NOT NULL,
    "idDemande" TEXT,
    "offreCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'AVI-AIR',
    "providerOrderId" TEXT NOT NULL DEFAULT '',
    "bookingReference" TEXT NOT NULL DEFAULT '',
    "airlineName" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentRequiredBy" DATETIME,
    "priceGuaranteeExpiresAt" DATETIME,
    "requiresInstantPayment" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "cleIdempotence" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'SEARCHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationVol_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReservationVol_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SegmentVol" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "SegmentVol_idReservation_fkey" FOREIGN KEY ("idReservation") REFERENCES "ReservationVol" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PassagerVol" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idReservation" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TEXT NOT NULL,
    "sexe" TEXT NOT NULL DEFAULT '',
    "nationalite" TEXT NOT NULL DEFAULT '',
    "documentVoyage" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PassagerVol_idReservation_fkey" FOREIGN KEY ("idReservation") REFERENCES "ReservationVol" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JustificatifVol" (
    "idReservation" TEXT NOT NULL PRIMARY KEY,
    "mention" TEXT NOT NULL,
    "dateGeneration" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storagePath" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    CONSTRAINT "JustificatifVol_idReservation_fkey" FOREIGN KEY ("idReservation") REFERENCES "ReservationVol" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bailleur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "coordonnees" TEXT NOT NULL,
    "statutValidation" TEXT NOT NULL DEFAULT 'valide'
);

-- CreateTable
CREATE TABLE "Logement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idBailleur" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'disponible',
    "dateDisponibilite" TEXT NOT NULL,
    CONSTRAINT "Logement_idBailleur_fkey" FOREIGN KEY ("idBailleur") REFERENCES "Bailleur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Matching" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idEtablissement" TEXT NOT NULL,
    "idLogement" TEXT NOT NULL,
    "dureeVoitureMin" INTEGER NOT NULL,
    "dureeTransportMin" INTEGER NOT NULL,
    "heureReference" TEXT NOT NULL DEFAULT '08:30',
    "statut" TEXT NOT NULL,
    "dateCalcul" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Matching_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Matching_idLogement_fkey" FOREIGN KEY ("idLogement") REFERENCES "Logement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Affectation" (
    "idDemande" TEXT NOT NULL PRIMARY KEY,
    "idLogement" TEXT NOT NULL,
    "dateChoix" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'choisi',
    CONSTRAINT "Affectation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Affectation_idLogement_fkey" FOREIGN KEY ("idLogement") REFERENCES "Logement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListeAttente" (
    "idDemande" TEXT NOT NULL PRIMARY KEY,
    "criteres" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'inscrit',
    "dateInscription" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListeAttente_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Demande" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "idOffre" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "priorite" TEXT NOT NULL DEFAULT 'normal',
    "pourcentageAvancement" INTEGER NOT NULL DEFAULT 0,
    "etapeCourante" TEXT NOT NULL DEFAULT 'formulaire',
    "dateDerniereActivite" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "idOrigine" TEXT,
    "idEtablissement" TEXT,
    CONSTRAINT "Demande_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demande_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demande_idOrigine_fkey" FOREIGN KEY ("idOrigine") REFERENCES "Demande" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demande_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Demande" ("createdAt", "dateDerniereActivite", "etapeCourante", "id", "idOffre", "idUtilisateur", "pourcentageAvancement", "priorite", "reference", "statut", "updatedAt") SELECT "createdAt", "dateDerniereActivite", "etapeCourante", "id", "idOffre", "idUtilisateur", "pourcentageAvancement", "priorite", "reference", "statut", "updatedAt" FROM "Demande";
DROP TABLE "Demande";
ALTER TABLE "new_Demande" RENAME TO "Demande";
CREATE UNIQUE INDEX "Demande_reference_key" ON "Demande"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
