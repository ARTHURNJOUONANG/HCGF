-- CreateTable
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'actif'
);

-- CreateTable
CREATE TABLE "RegleCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idPartenaire" TEXT NOT NULL,
    "taux" INTEGER NOT NULL DEFAULT 0,
    "montantFixe" INTEGER NOT NULL DEFAULT 0,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RegleCommission_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "idRegleCommission" TEXT NOT NULL,
    "montantCalcule" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'calculee',
    "datePaiement" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commission_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Commission_idRegleCommission_fkey" FOREIGN KEY ("idRegleCommission") REFERENCES "RegleCommission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "idPartenaire" TEXT,
    CONSTRAINT "Demande_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demande_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demande_idOrigine_fkey" FOREIGN KEY ("idOrigine") REFERENCES "Demande" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demande_idEtablissement_fkey" FOREIGN KEY ("idEtablissement") REFERENCES "Etablissement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demande_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Demande" ("createdAt", "dateDerniereActivite", "etapeCourante", "id", "idEtablissement", "idOffre", "idOrigine", "idUtilisateur", "pourcentageAvancement", "priorite", "reference", "statut", "updatedAt") SELECT "createdAt", "dateDerniereActivite", "etapeCourante", "id", "idEtablissement", "idOffre", "idOrigine", "idUtilisateur", "pourcentageAvancement", "priorite", "reference", "statut", "updatedAt" FROM "Demande";
DROP TABLE "Demande";
ALTER TABLE "new_Demande" RENAME TO "Demande";
CREATE UNIQUE INDEX "Demande_reference_key" ON "Demande"("reference");
CREATE TABLE "new_Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "typeCompte" TEXT NOT NULL DEFAULT 'candidat',
    "role" TEXT NOT NULL DEFAULT '',
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "idPartenaire" TEXT,
    CONSTRAINT "Utilisateur_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Utilisateur" ("createdAt", "email", "id", "langue", "motDePasseHash", "role", "statut", "typeCompte", "updatedAt") SELECT "createdAt", "email", "id", "langue", "motDePasseHash", "role", "statut", "typeCompte", "updatedAt" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Commission_idDemande_key" ON "Commission"("idDemande");
