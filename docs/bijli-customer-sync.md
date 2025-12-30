# BIJLI Customer Sync Notes

## Purpose
Sync customer profile data from the BIJLI API into Prisma `Customer` records using a memberNo list (CSV). The sync is idempotent via upsert on `memberNo`.

## BIJLI Endpoint
```
GET https://ace.bijliftt.com/ShareData.asmx/ReturnMemberInfo?pMemberNo=00{MemberId}
```
Only the first item in the response array is used.

## Mapping Summary
- `memberNo` ← `MemberNo` (fallback to input memberNo)
- `fullName` ← `MemberName` (mojibake fix)  
  - fallback: `LastNM + MidNm + FirstNm`  
  - final fallback: `memberNo`
- `gender` ← `Gender`  
  - `Female` → `Nữ`
  - `Male` → `Nam`
- `idCardNumber` ← `IdProofNumber`
- `phoneNumber` ← `ContNo` **(TODO: confirm BIJLI field)**
- `groupName` ← `GroupName` (mojibake fix)
- `groupCode` ← `GroupCode` or prefix parsed from `groupName` **(best-effort)**
- `villageName` ← `VillageName` or `Village`
- `locationType` ← `LocationType` or inferred  
  - `Rural` if `villageName` exists, otherwise `Urban` **(TODO: confirm rule)**
- `membershipStartDate` ← `AdmissionDate` or `MembershipStartDate` (flexible date parser)
- `lastSyncedAt` ← now

## Date Parsing
Uses a flexible dd/MM vs MM/DD heuristic and avoids `new Date(string)` to reduce ambiguity.

## How to Run
1) Prepare a CSV with one column of `memberNo` values (header optional).
2) Run:
```
cd backend
npx ts-node scripts/import-bijli-customers.ts --file path/to/membernos.csv
```

## Files Touched
- `backend/prisma/schema.prisma` (add `Customer.lastSyncedAt`)
- `backend/prisma/migrations/20251210061000_add_customer_last_synced_at/migration.sql`
- `backend/src/modules/customers/bijli-client.service.ts`
- `backend/src/modules/customers/bijli-customer-sync.service.ts`
- `backend/src/modules/customers/customers.module.ts`
- `backend/scripts/import-bijli-customers.ts`
