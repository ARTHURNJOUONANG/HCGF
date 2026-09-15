-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "typeCompte" TEXT NOT NULL DEFAULT 'candidat',
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProfilCandidat" (
    "idUtilisateur" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "nationalite" TEXT,
    "paysResidence" TEXT,
    CONSTRAINT "ProfilCandidat_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pays" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Service" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "OffreService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codePays" TEXT NOT NULL,
    "codeService" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "texteExplicatif" TEXT NOT NULL,
    "etapesParcours" TEXT NOT NULL,
    CONSTRAINT "OffreService_codePays_fkey" FOREIGN KEY ("codePays") REFERENCES "Pays" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OffreService_codeService_fkey" FOREIGN KEY ("codeService") REFERENCES "Service" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formulaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idOffre" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Formulaire_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChampFormulaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "ChampFormulaire_idFormulaire_fkey" FOREIGN KEY ("idFormulaire") REFERENCES "Formulaire" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PieceRequise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idOffre" TEXT NOT NULL,
    "typePiece" TEXT NOT NULL,
    "obligatoire" BOOLEAN NOT NULL,
    "ordreFusion" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    CONSTRAINT "PieceRequise_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Demande" (
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
    CONSTRAINT "Demande_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demande_idOffre_fkey" FOREIGN KEY ("idOffre") REFERENCES "OffreService" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReponseFormulaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "idChamp" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "dateSaisie" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verrouillee" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ReponseFormulaire_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReponseFormulaire_idChamp_fkey" FOREIGN KEY ("idChamp") REFERENCES "ChampFormulaire" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'a_venir',
    "ordre" INTEGER NOT NULL,
    CONSTRAINT "ItemChecklist_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OffreService_codePays_codeService_key" ON "OffreService"("codePays", "codeService");

-- CreateIndex
CREATE UNIQUE INDEX "Formulaire_idOffre_key" ON "Formulaire"("idOffre");

-- CreateIndex
CREATE UNIQUE INDEX "Demande_reference_key" ON "Demande"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ReponseFormulaire_idDemande_idChamp_key" ON "ReponseFormulaire"("idDemande", "idChamp");
