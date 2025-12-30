# BIJLI Loan Sync Notes

## Purpose
Sync loan data for a customer from the BIJLI API into Prisma models (`Loan`, `LoanInstallment`) and cache results to avoid excessive external calls.

## TTL / Cache
- Cache field: `Loan.lastSyncedAt`
- TTL: **6 hours** (`LOAN_SYNC_TTL_MS = 6 * 60 * 60 * 1000`)
- Behavior: `/loan/current` triggers sync if no active loan or `lastSyncedAt` is stale.

## BIJLI Endpoint
```
GET https://ace.bijliftt.com/ShareData.asmx/ReturnMemberInfo?pMemberNo=00{MemberId}
```
Only the first item in the response array is used.

## Mapping Summary
- `loanNo` → `LoanNo`
- `externalLoanId` → `ContNo`
- `productName` → `ProductName`
- `loanCycle` → `LoanCycle` (parsed int)
- `interestRate`:
  - contains `BULLET` → 16.8
  - contains `POOR` → 13.8
  - otherwise → 0 (TODO)
- `termInstallments` → count of `RepamentSchedule`
- `maturityDate` → max `DueDate`
- `principalAmount` → sum of `Principal` in schedule (fallback to `LoS`)
- `totalPrincipalOutstanding` → `LoS`
- `totalInterestOutstanding` → sum of `Interest` for due dates >= today (Asia/Bangkok) **best-effort**
- `status` → `CLOSED` if outstanding <= 0, else `ACTIVE`
- `lastSyncedAt` → now

Installments:
- Sorted by `DueDate` ascending
- `installmentNo` assigned 1..n
- Upsert by unique key `(loanId, installmentNo)`
- `principalDue`, `interestDue` from schedule
- `status` stays `PENDING` (no paid/unpaid inference)

## Files Touched
- `backend/prisma/schema.prisma` (add `lastSyncedAt`)
- `backend/prisma/migrations/20251210060000_add_loan_last_synced_at/migration.sql`
- `backend/src/modules/loans/bijli-client.service.ts`
- `backend/src/modules/loans/loans.module.ts`
- `backend/src/modules/loans/loans.service.ts`

## Notes
- Date parsing uses a flexible dd/MM vs MM/DD heuristic.
- Avoids `new Date(str)` to reduce locale ambiguity.
