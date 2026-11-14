-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AlerteFraude" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idDemande" TEXT NOT NULL,
    "idDocument" TEXT,
    "typeSignal" TEXT NOT NULL,
    "niveau" TEXT NOT NULL DEFAULT 'moyen',
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "detail" TEXT NOT NULL,
    "idActeurTraitement" TEXT,
    "traiteAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlerteFraude_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "Demande" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlerteFraude_idDocument_fkey" FOREIGN KEY ("idDocument") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AlerteFraude" ("createdAt", "detail", "id", "idDemande", "niveau", "statut", "typeSignal") SELECT "createdAt", "detail", "id", "idDemande", "niveau", "statut", "typeSignal" FROM "AlerteFraude";
DROP TABLE "AlerteFraude";
ALTER TABLE "new_AlerteFraude" RENAME TO "AlerteFraude";
CREATE INDEX "AlerteFraude_idDemande_statut_idx" ON "AlerteFraude"("idDemande", "statut");
CREATE INDEX "AlerteFraude_typeSignal_statut_idx" ON "AlerteFraude"("typeSignal", "statut");
CREATE INDEX "AlerteFraude_idDocument_idx" ON "AlerteFraude"("idDocument");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Demande_idUtilisateur_idx" ON "Demande"("idUtilisateur");

-- CreateIndex
CREATE INDEX "Demande_statut_dateDerniereActivite_idx" ON "Demande"("statut", "dateDerniereActivite");

-- CreateIndex
CREATE INDEX "Demande_idOffre_idx" ON "Demande"("idOffre");

-- CreateIndex
CREATE INDEX "Demande_idPartenaire_idx" ON "Demande"("idPartenaire");

-- CreateIndex
CREATE INDEX "Document_idDemande_idx" ON "Document"("idDemande");

-- CreateIndex
CREATE INDEX "Document_idAuteur_idx" ON "Document"("idAuteur");

-- CreateIndex
CREATE INDEX "ItemChecklist_idDemande_idx" ON "ItemChecklist"("idDemande");

-- CreateIndex
CREATE INDEX "JournalAudit_idDemande_idx" ON "JournalAudit"("idDemande");

-- CreateIndex
CREATE INDEX "JournalAudit_createdAt_idx" ON "JournalAudit"("createdAt");

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

