-- CreateEnum
CREATE TYPE "GroupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GroupRequestType" AS ENUM ('CREATE', 'UPDATE');

-- CreateTable
CREATE TABLE "GroupRequest" (
    "id" BIGSERIAL NOT NULL,
    "type" "GroupRequestType" NOT NULL,
    "status" "GroupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "branchCode" TEXT NOT NULL,
    "targetGroupId" BIGINT,
    "proposedGroupCode" TEXT,
    "proposedGroupName" TEXT NOT NULL,
    "proposedGroupNameKey" TEXT NOT NULL,
    "createdByStaffId" BIGINT NOT NULL,
    "reviewedByStaffId" BIGINT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupRequest_branchCode_status_idx" ON "GroupRequest"("branchCode", "status");

-- CreateIndex
CREATE INDEX "GroupRequest_createdByStaffId_status_idx" ON "GroupRequest"("createdByStaffId", "status");

-- CreateIndex
CREATE INDEX "GroupRequest_expiresAt_idx" ON "GroupRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "GroupRequest_targetGroupId_idx" ON "GroupRequest"("targetGroupId");
