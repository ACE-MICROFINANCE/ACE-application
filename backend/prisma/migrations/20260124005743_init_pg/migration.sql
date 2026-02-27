-- CreateTable
CREATE TABLE "Customer" (
    "id" BIGSERIAL NOT NULL,
    "memberNo" TEXT NOT NULL,
    "fullName" TEXT,
    "gender" TEXT,
    "idCardNumber" TEXT,
    "phoneNumber" TEXT,
    "locationType" TEXT,
    "villageName" TEXT,
    "groupCode" TEXT,
    "groupName" TEXT,
    "branchCode" TEXT,
    "branchName" TEXT,
    "membershipStartDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accessibilityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCredential" (
    "customerId" BIGINT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "tempPasswordEncrypted" TEXT,
    "tempPasswordIssuedAt" TIMESTAMP(3),
    "passwordUpdatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "CustomerCredential_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" BIGSERIAL NOT NULL,
    "customerId" BIGINT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "branchCode" TEXT,
    "fullName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" BIGSERIAL NOT NULL,
    "customerId" BIGINT NOT NULL,
    "loanNo" TEXT NOT NULL,
    "externalLoanId" TEXT,
    "productName" TEXT,
    "loanCycle" INTEGER,
    "principalAmount" DECIMAL(65,30) NOT NULL,
    "interestRate" DECIMAL(65,30) NOT NULL,
    "termInstallments" INTEGER,
    "disbursementDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "totalPrincipalOutstanding" DECIMAL(65,30),
    "totalInterestOutstanding" DECIMAL(65,30),
    "lastSyncedAt" TIMESTAMP(3),
    "loanType" TEXT NOT NULL DEFAULT 'DEGRESSIVE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanInstallment" (
    "id" BIGSERIAL NOT NULL,
    "loanId" BIGINT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalDue" DECIMAL(65,30) NOT NULL,
    "interestDue" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSavings" (
    "id" BIGSERIAL NOT NULL,
    "customerId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "principalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "interestAccrued" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastDepositAmount" DECIMAL(65,30),
    "lastDepositDate" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSavings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSavingsTransaction" (
    "id" BIGSERIAL NOT NULL,
    "customerId" BIGINT NOT NULL,
    "savingsType" TEXT NOT NULL,
    "trnDate" TIMESTAMP(3) NOT NULL,
    "trnType" TEXT NOT NULL,
    "depositAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "withdrawalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "externalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "groupCode" TEXT,
    "villageName" TEXT,
    "branchCode" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "audienceType" TEXT NOT NULL DEFAULT 'BRANCH_ALL',
    "locationName" TEXT,
    "durationMinutes" INTEGER,
    "createdByStaffId" BIGINT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTargetGroup" (
    "id" BIGSERIAL NOT NULL,
    "eventId" BIGINT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT,

    CONSTRAINT "EventTargetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" BIGSERIAL NOT NULL,
    "customerId" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "exportBatchId" INTEGER,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientActorKind" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notificationKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_memberNo_key" ON "Customer"("memberNo");

-- CreateIndex
CREATE INDEX "Customer_branchCode_groupCode_idx" ON "Customer"("branchCode", "groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanNo_key" ON "Loan"("loanNo");

-- CreateIndex
CREATE UNIQUE INDEX "LoanInstallment_loanId_installmentNo_key" ON "LoanInstallment"("loanId", "installmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSavings_customerId_type_key" ON "CustomerSavings"("customerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSavingsTransaction_externalKey_key" ON "CustomerSavingsTransaction"("externalKey");

-- CreateIndex
CREATE INDEX "CustomerSavingsTransaction_customerId_savingsType_trnDate_idx" ON "CustomerSavingsTransaction"("customerId", "savingsType", "trnDate");

-- CreateIndex
CREATE INDEX "EventTargetGroup_groupCode_idx" ON "EventTargetGroup"("groupCode");

-- CreateIndex
CREATE INDEX "EventTargetGroup_eventId_idx" ON "EventTargetGroup"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTargetGroup_eventId_groupCode_key" ON "EventTargetGroup"("eventId", "groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_notificationKey_key" ON "Notification"("notificationKey");

-- CreateIndex
CREATE INDEX "Notification_recipientActorKind_recipientId_idx" ON "Notification"("recipientActorKind", "recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_actorKind_actorId_idx" ON "DeviceToken"("actorKind", "actorId");

-- AddForeignKey
ALTER TABLE "CustomerCredential" ADD CONSTRAINT "CustomerCredential_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanInstallment" ADD CONSTRAINT "LoanInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSavings" ADD CONSTRAINT "CustomerSavings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSavingsTransaction" ADD CONSTRAINT "CustomerSavingsTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTargetGroup" ADD CONSTRAINT "EventTargetGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
