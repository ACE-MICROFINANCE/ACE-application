-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "ssoId" BIGINT;

-- AlterTable
ALTER TABLE "GroupRequest" ADD COLUMN     "proposedSsoId" BIGINT;

-- CreateIndex
CREATE INDEX "Group_ssoId_idx" ON "Group"("ssoId");

-- CreateIndex
CREATE INDEX "GroupRequest_proposedSsoId_idx" ON "GroupRequest"("proposedSsoId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ssoId_fkey" FOREIGN KEY ("ssoId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRequest" ADD CONSTRAINT "GroupRequest_proposedSsoId_fkey" FOREIGN KEY ("proposedSsoId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
