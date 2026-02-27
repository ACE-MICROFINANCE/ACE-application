-- CreateTable
CREATE TABLE "FeatureUsageEvent" (
    "id" BIGSERIAL NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "role" TEXT,
    "branchCode" TEXT,
    "featureKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'VIEW',
    "source" TEXT,
    "clientEventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureUsageEvent_clientEventId_key" ON "FeatureUsageEvent"("clientEventId");

-- CreateIndex
CREATE INDEX "FeatureUsageEvent_occurredAt_idx" ON "FeatureUsageEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "FeatureUsageEvent_featureKey_occurredAt_idx" ON "FeatureUsageEvent"("featureKey", "occurredAt");

-- CreateIndex
CREATE INDEX "FeatureUsageEvent_actorKind_actorId_occurredAt_idx" ON "FeatureUsageEvent"("actorKind", "actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "FeatureUsageEvent_branchCode_occurredAt_idx" ON "FeatureUsageEvent"("branchCode", "occurredAt");
