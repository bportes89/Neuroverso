-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'FAILED');

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL,
    "signedByName" TEXT,
    "signedByDocument" TEXT,
    "storagePath" TEXT,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signature_reportId_createdAt_idx" ON "Signature"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SessionReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

