CREATE INDEX IF NOT EXISTS "Customer_updatedAt_idx"
ON "Customer"("updatedAt");

CREATE INDEX IF NOT EXISTS "Customer_branchCode_updatedAt_idx"
ON "Customer"("branchCode", "updatedAt");
