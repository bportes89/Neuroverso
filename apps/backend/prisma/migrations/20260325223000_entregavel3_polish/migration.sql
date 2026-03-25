-- AlterEnum
ALTER TYPE "SignatureStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "SignatureStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- AlterTable
ALTER TABLE "Signature"
ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "providerRequestId" TEXT,
ADD COLUMN     "signUrl" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedStoragePath" TEXT,
ADD COLUMN     "signedSha256" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "meta" JSONB;

-- DropIndex
DROP INDEX IF EXISTS "Signature_reportId_createdAt_idx";

-- CreateIndex
CREATE INDEX "Signature_reportId_status_createdAt_idx" ON "Signature"("reportId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SignedUrlResource" AS ENUM ('REPORT_PDF', 'SIGNED_REPORT_PDF', 'SIGNATURE_EVIDENCE', 'SHORT_CLIP');

-- CreateTable
CREATE TABLE "SignedUrl" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "resource" "SignedUrlResource" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignedUrl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignedUrl_token_key" ON "SignedUrl"("token");

-- CreateIndex
CREATE INDEX "SignedUrl_expiresAt_idx" ON "SignedUrl"("expiresAt");

-- CreateIndex
CREATE INDEX "SignedUrl_resource_resourceId_idx" ON "SignedUrl"("resource", "resourceId");

-- AddForeignKey
ALTER TABLE "SignedUrl" ADD CONSTRAINT "SignedUrl_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MediaConsent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "grantedById" TEXT,
    "streaming" BOOLEAN NOT NULL DEFAULT false,
    "shorts" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaConsent_appointmentId_key" ON "MediaConsent"("appointmentId");

-- AddForeignKey
ALTER TABLE "MediaConsent" ADD CONSTRAINT "MediaConsent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaConsent" ADD CONSTRAINT "MediaConsent_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

