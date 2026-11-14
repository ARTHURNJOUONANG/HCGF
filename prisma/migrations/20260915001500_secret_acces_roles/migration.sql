-- CreateTable
CREATE TABLE "SecretInterne" (
    "cle" TEXT NOT NULL PRIMARY KEY,
    "valeur" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
