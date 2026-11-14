-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_idPieceRequise_fkey" FOREIGN KEY ("idPieceRequise") REFERENCES "PieceRequise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_idAuteur_fkey" FOREIGN KEY ("idAuteur") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    CONSTRAINT "Conversation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idConversation" TEXT NOT NULL,
    "idAuteur" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_idConversation_fkey" FOREIGN KEY ("idConversation") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_idAuteur_fkey" FOREIGN KEY ("idAuteur") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idUtilisateur" TEXT NOT NULL,
    "idDemande" TEXT,
    "evenement" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'non_lue',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TacheInterne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "idAssignee" TEXT,
    "action" TEXT NOT NULL,
    "priorite" TEXT NOT NULL DEFAULT 'normal',
    "statut" TEXT NOT NULL DEFAULT 'a_faire',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TacheInterne_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TacheInterne_idAssignee_fkey" FOREIGN KEY ("idAssignee") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idActeur" TEXT,
    "action" TEXT NOT NULL,
    "objetType" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    "idDemande" TEXT,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalAudit_idActeur_fkey" FOREIGN KEY ("idActeur") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalAudit_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JetonVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idDocument" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'valide',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JetonVerification_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JetonVerification_idDocument_fkey" FOREIGN KEY ("idDocument") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDocument" TEXT NOT NULL,
    "idSignataire" TEXT NOT NULL,
    "dateSignature" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_idDocument_fkey" FOREIGN KEY ("idDocument") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signature_idSignataire_fkey" FOREIGN KEY ("idSignataire") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "typeCompte" TEXT NOT NULL DEFAULT 'candidat',
    "role" TEXT NOT NULL DEFAULT '',
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Utilisateur" ("createdAt", "email", "id", "langue", "motDePasseHash", "statut", "typeCompte", "updatedAt") SELECT "createdAt", "email", "id", "langue", "motDePasseHash", "statut", "typeCompte", "updatedAt" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_idDemande_key" ON "Conversation"("idDemande");

-- CreateIndex
CREATE UNIQUE INDEX "JetonVerification_token_key" ON "JetonVerification"("token");
