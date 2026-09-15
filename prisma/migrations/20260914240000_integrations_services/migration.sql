-- AlterTable
ALTER TABLE "Demande" ADD COLUMN "controleRenforce" BOOLEAN NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "ocrStatut" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Document" ADD COLUMN "ocrTexte" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Document" ADD COLUMN "ocrJson" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Document_hash_idx" ON "Document"("hash");

-- CreateTable
CREATE TABLE "FournisseurExterne" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "OperationApi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeFournisseur" TEXT NOT NULL,
    "idDemande" TEXT,
    "action" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "cleIdempotence" TEXT NOT NULL,
    "nbTentatives" INTEGER NOT NULL DEFAULT 0,
    "derniereErreur" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationApi_codeFournisseur_fkey" FOREIGN KEY ("codeFournisseur") REFERENCES "FournisseurExterne" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OperationApi_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationApi_cleIdempotence_key" ON "OperationApi"("cleIdempotence");
CREATE INDEX "OperationApi_statut_idx" ON "OperationApi"("statut");

-- CreateTable
CREATE TABLE "TentativeApi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idOperation" TEXT NOT NULL,
    "dateTentative" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codeHttp" INTEGER NOT NULL DEFAULT 0,
    "reponse" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "TentativeApi_idOperation_fkey" FOREIGN KEY ("idOperation") REFERENCES "OperationApi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlerteFraude" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "typeSignal" TEXT NOT NULL,
    "niveau" TEXT NOT NULL DEFAULT 'moyen',
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlerteFraude_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AlerteFraude_idDemande_statut_idx" ON "AlerteFraude"("idDemande", "statut");

-- CreateTable
CREATE TABLE "DoubleValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "typeOperation" TEXT NOT NULL,
    "idVerificateur" TEXT NOT NULL,
    "idValidateur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'verifie',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DoubleValidation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoubleValidation_idVerificateur_fkey" FOREIGN KEY ("idVerificateur") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DoubleValidation_idValidateur_fkey" FOREIGN KEY ("idValidateur") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DoubleValidation_idDemande_typeOperation_idx" ON "DoubleValidation"("idDemande", "typeOperation");

INSERT INTO "FournisseurExterne" ("code", "libelle", "actif") VALUES
  ('duffel', 'Duffel (vols)', 1),
  ('psp', 'Paiement (Stripe)', 1),
  ('assureur', 'Assureur', 1),
  ('maps', 'Cartes / trajets', 1),
  ('esign', 'Signature électronique', 1),
  ('ocr', 'OCR pièces', 1),
  ('ia', 'IA métier', 1);
