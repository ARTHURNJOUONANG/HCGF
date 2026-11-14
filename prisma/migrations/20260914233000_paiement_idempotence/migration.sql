-- AlterTable
ALTER TABLE "OperationFinanciere" ADD COLUMN "cleIdempotence" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OperationFinanciere_cleIdempotence_key" ON "OperationFinanciere"("cleIdempotence");
