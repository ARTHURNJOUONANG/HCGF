-- CreateTable
CREATE TABLE "JetonReinitialisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "expireAt" DATETIME NOT NULL,
    "utiliseAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JetonReinitialisation_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JetonReinitialisation_token_key" ON "JetonReinitialisation"("token");
