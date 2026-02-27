-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "lastPasswordExpiryReminderAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "tempPasswordEncrypted" TEXT,
ADD COLUMN     "tempPasswordIssuedAt" TIMESTAMP(3);
