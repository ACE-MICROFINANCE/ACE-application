/*
  Warnings:

  - Added the required column `updatedAt` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UnmappedReason" AS ENUM ('NOT_FOUND', 'AMBIGUOUS');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "groupNameKey" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Group" (
    "id" BIGSERIAL NOT NULL,
    "branchCode" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "groupNameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmappedGroupName" (
    "id" BIGSERIAL NOT NULL,
    "rawGroupName" TEXT NOT NULL,
    "groupNameKey" TEXT NOT NULL,
    "reason" "UnmappedReason" NOT NULL,
    "candidateCount" INTEGER,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleMemberNo" TEXT,

    CONSTRAINT "UnmappedGroupName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Group_groupNameKey_idx" ON "Group"("groupNameKey");

-- CreateIndex
CREATE INDEX "Group_branchCode_groupNameKey_idx" ON "Group"("branchCode", "groupNameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Group_branchCode_groupCode_key" ON "Group"("branchCode", "groupCode");

-- CreateIndex
CREATE INDEX "UnmappedGroupName_lastSeenAt_idx" ON "UnmappedGroupName"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UnmappedGroupName_groupNameKey_reason_key" ON "UnmappedGroupName"("groupNameKey", "reason");

-- CreateIndex
CREATE INDEX "Customer_groupNameKey_idx" ON "Customer"("groupNameKey");
