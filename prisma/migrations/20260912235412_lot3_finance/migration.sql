-- CreateTable
CREATE TABLE "BaremeTarifaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idOffre" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "frais" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateEffet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaremeTarifaire_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TarifApplique" (
    "idDemande" TEXT NOT NULL PRIMARY KEY,
    "idBareme" TEXT NOT NULL,
    "montantAccepte" INTEGER NOT NULL,
    "frais" INTEGER NOT NULL,
    "versionBareme" TEXT NOT NULL,
    "dateAcceptation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TarifApplique_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TarifApplique_idBareme_fkey" FOREIGN KEY ("idBareme") REFERENCES "BaremeTarifaire" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EspaceFinancier" (
    "idDemande" TEXT NOT NULL PRIMARY KEY,
    "montantAttendu" INTEGER NOT NULL,
    "montantRecu" INTEGER NOT NULL DEFAULT 0,
    "frais" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "statutFonds" TEXT NOT NULL DEFAULT 'en_attente',
    CONSTRAINT "EspaceFinancier_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationFinanciere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idEspace" TEXT NOT NULL,
    "idRemboursement" TEXT,
    "type" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "reference" TEXT NOT NULL DEFAULT '',
    "idTransaction" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationFinanciere_idEspace_fkey" FOREIGN KEY ("idEspace") REFERENCES "EspaceFinancier" ("idDemande") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OperationFinanciere_idRemboursement_fkey" FOREIGN KEY ("idRemboursement") REFERENCES "DemandeRemboursement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemandeRemboursement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "coordonnees" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'recue',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemandeRemboursement_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PieceComptable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storagePath" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    CONSTRAINT "PieceComptable_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PieceComptable_numero_key" ON "PieceComptable"("numero");
