-- CreateTable
CREATE TABLE "SessionAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idUtilisateur" TEXT NOT NULL,
    "expireAt" DATETIME NOT NULL,
    "revoqueeAt" DATETIME,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionAuth_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvenementAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idUtilisateur" TEXT,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvenementAuth_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "echecsConnexion" INTEGER NOT NULL DEFAULT 0,
    "verrouilleJusqua" DATETIME,
    "mfaSecret" TEXT,
    "mfaActive" BOOLEAN NOT NULL DEFAULT false,
    "derniereConnexion" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "idPartenaire" TEXT,
    CONSTRAINT "Utilisateur_idPartenaire_fkey" FOREIGN KEY ("idPartenaire") REFERENCES "Partenaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Utilisateur" ("createdAt", "email", "id", "idPartenaire", "langue", "motDePasseHash", "role", "statut", "typeCompte", "updatedAt") SELECT "createdAt", "email", "id", "idPartenaire", "langue", "motDePasseHash", "role", "statut", "typeCompte", "updatedAt" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SessionAuth_idUtilisateur_idx" ON "SessionAuth"("idUtilisateur");

-- CreateIndex
CREATE INDEX "SessionAuth_expireAt_idx" ON "SessionAuth"("expireAt");

-- CreateIndex
CREATE INDEX "EvenementAuth_email_createdAt_idx" ON "EvenementAuth"("email", "createdAt");

-- CreateIndex
CREATE INDEX "EvenementAuth_ip_createdAt_idx" ON "EvenementAuth"("ip", "createdAt");
