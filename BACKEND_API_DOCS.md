# ACE Farmer Backend API

## Overview
- Stack: NestJS 10, Prisma ORM (SQL Server provider), JWT (access + refresh), bcrypt, class-validator, Swagger at `/docs`.
- Authentication: numeric `memberNo` + numeric password (>= 6 digits). Access token short-lived, refresh token long-lived and stored hashed in DB. Flag `mustChangePassword` forces password rotation after first login or admin reset.
- Admin protection: header `X-ADMIN-KEY` must match `ADMIN_API_KEY` in `.env`.
- Information screen is **frontend-only** for now: no `/info` API; only feedback is stored.
- Loan QR: `/loan/current` builds VietQR payload (`bankBin`, `accountNumber`, `accountName`, `description`, `amount`) from env `PAYMENT_BANK_BIN`, `PAYMENT_BANK_ACCOUNT_NO`, `PAYMENT_BANK_ACCOUNT_NAME`.

## Data Model (Prisma)
- **Customer**: id (BigInt), `memberNo` (unique), `fullName`, optional gender/idCardNumber/phoneNumber/locationType/villageName/groupCode/groupName, `membershipStartDate`, `isActive`, timestamps.
- **CustomerCredential**: `customerId`, `passwordHash`, `mustChangePassword`, `passwordUpdatedAt`, `lastLoginAt`.
- **RefreshToken**: id, `customerId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`.
- **Loan**: id, `customerId`, `loanNo` (unique), optional externalLoanId/productName/loanCycle, `principalAmount`, `interestRate`, `termInstallments`, `disbursementDate`, `maturityDate`, `totalPrincipalOutstanding`, `totalInterestOutstanding`, `status`, timestamps.
- **LoanInstallment**: id, `loanId`, `installmentNo`, `dueDate`, `principalDue`, `interestDue`, `status`, `createdAt`.
- **CustomerSavings**: id, `customerId`, `type` (`COMPULSORY`/`VOLUNTARY`), `principalAmount`, `currentBalance`, `interestAccrued`, `lastDepositAmount`, `lastDepositDate`, `importedAt`.
- **Event**: id, `title`, `description`, `eventType`, `startDate`, `endDate`, `scope` (`GLOBAL`/`GROUP`/`VILLAGE`), `groupCode`, `villageName`, `importedAt`.
- **Feedback**: id, `customerId`, `content`, `status`, `createdAt`, `exportBatchId`.

## Auth Flow
- **Login** (`POST /auth/login`): validate numeric `memberNo`/`password`, ensure customer active, verify bcrypt hash, update `lastLoginAt`, issue access+refresh tokens and store hashed refresh token.
- **Refresh token** (`POST /auth/refresh`): verify JWT + DB hash (not revoked, not expired), rotate refresh token (old revoked) and return new pair.
- **Change password** (`POST /auth/change-password`): access-token protected; old/new/confirm must be numeric >= 6, new != old, new == confirm; updates hash, clears `mustChangePassword`, revokes existing refresh tokens, returns new pair.
- **Logout** (`POST /auth/logout`): refresh-token protected; revokes given refresh token.
- **Admin reset password** (`POST /admin/customers/:id/reset-password`): generates new numeric temp password, hashes it, sets `mustChangePassword=true`, revokes refresh tokens, returns the plain temp password once.

## API Endpoints
Auth header for protected endpoints: `Authorization: Bearer <accessToken>`.

- `POST /auth/login` (public)  
  Body: `{ "memberNo": "100001", "password": "123456" }`  
  Response: `{ "accessToken": "...", "refreshToken": "...", "customer": { "id": 1, "memberNo": "100001", "fullName": "...", "mustChangePassword": true } }`

- `POST /auth/refresh` (public with refresh token)  
  Body: `{ "refreshToken": "<token>" }`  
  Response: same shape as login (new tokens).

- `POST /auth/change-password` (access token required)  
  Body: `{ "oldPassword": "123456", "newPassword": "654321", "confirmPassword": "654321" }`  
  Response: new tokens + customer info.

- `POST /auth/logout` (refresh token required)  
  Body: `{ "refreshToken": "<token>" }`  
  Response: `{ "success": true }`

- `GET /me` (access token)  
  Response example:
  ```json
  {
    "id": 1,
    "memberNo": "100001",
    "fullName": "Nguyen Van A",
    "gender": "Male",
    "idCardNumber": "012345678",
    "phoneNumber": "0912345678",
    "locationType": "Rural",
    "villageName": "Noong Nhai",
    "groupCode": "G01",
    "groupName": "Group 1",
    "membershipStartDate": "2025-10-01T00:00:00.000Z",
    "mustChangePassword": true
  }
  ```

- `GET /dashboard/summary` (access token)  
  Response example:
  ```json
  {
    "customer": { "id": 1, "memberNo": "100001", "fullName": "Nguyen Van A" },
    "loanReminder": {
      "loanNo": "L001",
      "nextDueDate": "2025-12-08T00:00:00.000Z",
      "nextPrincipalDue": 3000000,
      "nextInterestDue": 0,
      "daysUntilDue": 7
    },
    "eventReminders": [
      { "id": 1, "title": "Meeting at Noong Nhai ward", "eventType": "MEETING", "startDate": "2025-12-06T00:00:00.000Z", "daysUntilEvent": 5 }
    ],
    "savingsSummary": [
      { "type": "COMPULSORY", "principalAmount": 30000000, "currentBalance": 33000000, "interestAccrued": 3000000, "lastDepositAmount": null, "lastDepositDate": "2025-10-27T00:00:00.000Z" },
      { "type": "VOLUNTARY", "principalAmount": 30000000, "currentBalance": 33500000, "interestAccrued": 3000000, "lastDepositAmount": 500000, "lastDepositDate": "2025-10-27T00:00:00.000Z" }
    ]
  }
  ```

- `GET /loan/current` (access token)  
  Response example:
  ```json
  {
    "loanNo": "L001",
    "disbursementDate": "2025-11-24T00:00:00.000Z",
    "principalAmount": 30000000,
    "remainingPrincipal": 27000000,
    "interestRate": 3,
    "nextPayment": {
      "dueDate": "2025-12-08T00:00:00.000Z",
      "principalDue": 3000000,
      "interestDue": 0
    },
    "qrPayload": {
      "bankBin": "970415",
      "accountNumber": "1234567890",
      "accountName": "ACE FARMER",
      "description": "100001 NGUYEN VAN A",
      "amount": 3000000
    }
  }
  ```

- `GET /savings` (access token)  
  Response: array of savings snapshots (0–2 records) with fields `type`, `principalAmount`, `currentBalance`, `interestAccrued`, `lastDepositAmount`, `lastDepositDate`.

- `GET /schedule` (access token)  
  Filters by scope: GLOBAL, matching groupCode, or matching villageName; startDate >= today.  
  Response example:
  ```json
  [
    { "id": 1, "title": "Meeting at Noong Nhai ward", "eventType": "MEETING", "startDate": "2025-12-06T00:00:00.000Z", "daysUntilEvent": 5 },
    { "id": 2, "title": "Plant rice seedlings", "eventType": "FARMING_TASK", "startDate": "2025-12-16T00:00:00.000Z", "daysUntilEvent": 15 }
  ]
  ```

- `GET /schedule/{id}` (access token)  
  Response example:
  ```json
  { "id": 1, "title": "Meeting at Noong Nhai ward", "eventType": "MEETING", "startDate": "2025-12-06T08:00:00.000Z", "endDate": "2025-12-06T10:00:00.000Z", "description": "Monthly group meeting." }
  ```

- `POST /feedback` (access token)  
  Body: `{ "content": "My feedback text..." }`  
  Response: created feedback `{ "id": 1, "customerId": 1, "content": "...", "status": "NEW", "createdAt": "..." }`.

- `GET /feedback` (access token, optional)  
  Lists feedback created by the current customer.

- `POST /admin/customers` (admin key)  
  Header: `X-ADMIN-KEY: <ADMIN_API_KEY>`  
  Body includes member/profile fields. Response:
  ```json
  {
    "customer": { "id": 2, "memberNo": "100002", "fullName": "Nguyen Van B", "...": "..." },
    "temporaryPassword": "123456"
  }
  ```

- `POST /admin/customers/{id}/reset-password` (admin key)  
  Response: `{ "temporaryPassword": "987654" }`

## Error Handling
- Validation: `400 Bad Request` with `{ "statusCode": 400, "message": ["..."], "error": "Bad Request" }`.
- Auth errors: `401 Unauthorized` with `{ "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized" }`.
- Not found: `404 Not Found` with `{ "statusCode": 404, "message": "Resource not found", "error": "Not Found" }`.

## Seed Data (prisma/seed.ts)
- Demo customer: `memberNo=100001`, password `123456`, full profile fields populated.
- Demo loan `L001` with 3 future installments, status ACTIVE.
- Demo savings: COMPULSORY and VOLUNTARY records with balances.
- Demo events: meeting (GROUP G01), planting task (VILLAGE Noong Nhai), field school (GLOBAL).
- Demo feedback: one NEW feedback row for the demo customer.

Run seed: `npm run prisma:seed` (after migrations and generate).

## How to Run Locally
1) `cd backend`  
2) `npm install`  
3) Create `.env` from `.env.example` and fill `DATABASE_URL`, JWT secrets, expiry, `ADMIN_API_KEY`.  
   Payment QR:
   ```
   PAYMENT_BANK_BIN=970415
   PAYMENT_BANK_ACCOUNT_NO=1234567890
   PAYMENT_BANK_ACCOUNT_NAME=ACE FARMER
   ```
4) Prisma:
   - `npx prisma migrate dev` (or `npm run prisma:migrate`)
   - `npx prisma generate`
   - `npm run prisma:seed`
5) Start server: `npm run start:dev` (default port 3001).  
6) Swagger docs: http://localhost:3001/docs

## Notes
- Information screen content is static on frontend; no `/info` endpoint yet.
- Password rules: numeric only, >=6 digits. Temp passwords (6–8 digits) returned only in admin responses.
