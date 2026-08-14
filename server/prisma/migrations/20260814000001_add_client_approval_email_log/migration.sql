-- CreateEnum
CREATE TYPE "ClientApprovalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ClientAgreementApproval" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT,
    "documentVersion" INTEGER NOT NULL DEFAULT 1,
    "recipientEmail" TEXT NOT NULL,
    "status" "ClientApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientAgreementApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "resendId" TEXT,
    "errorMessage" TEXT,
    "taskId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAgreementApproval_tokenHash_key" ON "ClientAgreementApproval"("tokenHash");

-- AddForeignKey
ALTER TABLE "ClientAgreementApproval" ADD CONSTRAINT "ClientAgreementApproval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkflowTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAgreementApproval" ADD CONSTRAINT "ClientAgreementApproval_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAgreementApproval" ADD CONSTRAINT "ClientAgreementApproval_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAgreementApproval" ADD CONSTRAINT "ClientAgreementApproval_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
