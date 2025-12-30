# BIJLI Loan Rules (ProductName Mapping)

## Purpose
Define loan type and interest rules derived from BIJLI `ProductName`, and include `totalDue` in next payment for QR/payment UI.

## Mapping Rules
- **Loan type**
  - If `ProductName` contains `BULLET` (case-insensitive) → `loanType = "BULLET"`
    - Label: **"Trả gốc cuối kỳ"**
  - Else → `loanType = "DEGRESSIVE"`
    - Label: **"Trả gốc lẫn lãi"**

- **Interest rate (annual)**
  - If `ProductName` contains `POOR` → `13.8`
  - Else → `16.8`

## Next Payment
- `nextInstallment` = first schedule item with `dueDate >= today`
- `totalDue = principalDue + interestDue`
- API `/loan/current` now returns:
  - `loanType`
  - `loanTypeLabel`
  - `nextPayment.totalDue`

## Files Touched
- `backend/prisma/schema.prisma` (add `Loan.loanType`)
- `backend/prisma/migrations/20251210062000_add_loan_type/migration.sql`
- `backend/src/modules/loans/loans.service.ts`
- `web/src/services/appApi.ts`
- `web/src/app/(private)/dashboard/loan/page.tsx`
