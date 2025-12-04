# ACE Farmer Backend API

## Overview
- Stack: NestJS 10, Prisma (SQL Server), JWT (access + refresh), bcrypt, class-validator, Swagger at `/docs`.
- Auth: numeric `memberNo` + numeric password (>=6). Access token short-lived, refresh token stored hashed. `mustChangePassword` enforces first-login/admin-reset change.
- Admin protection: header `X-ADMIN-KEY` must match `ADMIN_API_KEY` in `.env`.
- VietQR: `/loan/current` returns `qrPayload { bankBin, accountNumber, accountName, description, amount }` from PAYMENT_* envs.
- Information screen is frontend-only (no `/info` API yet).

## Data Model (Prisma)
- Customer, CustomerCredential, RefreshToken, Loan, LoanInstallment, CustomerSavings, Event, Feedback (see schema.prisma).

## Auth Flow
- **Login** `POST /auth/login`: numeric memberNo/password, update lastLoginAt, return access+refresh, store hashed refresh.
- **Request password reset** `POST /auth/request-password-reset`: body {memberNo}, always 200; if exists generate temp numeric password (6–8), hash, set mustChangePassword=true, email staff (MAIL_TO) with temp password + profile.
- **Refresh** `POST /auth/refresh`: verify JWT + hashed token in DB, rotate refresh token.
- **Change password** `POST /auth/change-password`: access token; if mustChangePassword=true skip oldPassword; else require oldPassword; update hash, set mustChangePassword=false, revoke refresh tokens, return new tokens+customer.
- **Logout** `POST /auth/logout`: revoke given refresh token.
- **Admin reset** `POST /admin/customers/:id/reset-password`: new temp numeric password, set mustChangePassword=true, revoke refresh tokens, return temp password once.

## API Endpoints (main)
- `POST /auth/login`
- `POST /auth/request-password-reset`
- `POST /auth/refresh`
- `POST /auth/change-password`
- `POST /auth/logout`
- `GET /me`
- `GET /dashboard/summary`
- `GET /loan/current`
- `GET /savings`
- `GET /schedule`
- `GET /schedule/{id}`
- `POST /feedback`
- `POST /admin/customers`
- `POST /admin/customers/{id}/reset-password`
Auth header for protected routes: `Authorization: Bearer <accessToken>`. Admin routes require `X-ADMIN-KEY`.

## Sample Responses
- Login response:
```
{
  "accessToken": "...",
  "refreshToken": "...",
  "customer": { "id": 1, "memberNo": "100001", "fullName": "Nguyen Van A", "mustChangePassword": true }
}
```
- Current loan:
```
{
  "loanNo": "L001",
  "disbursementDate": "2025-11-24T00:00:00.000Z",
  "principalAmount": 30000000,
  "remainingPrincipal": 27000000,
  "interestRate": 3,
  "nextPayment": {"dueDate": "2025-12-08T00:00:00.000Z", "principalDue": 3000000, "interestDue": 0},
  "qrPayload": {"bankBin":"970415","accountNumber":"1234567890","accountName":"ACE FARMER","description":"100001 NGUYEN VAN A","amount":3000000}
}
```

## Error Handling
- Validation: 400 `{ statusCode, message, error: "Bad Request" }`
- Auth: 401 `{ statusCode, message, error: "Unauthorized" }`
- Not found: 404 `{ statusCode, message, error: "Not Found" }`

## Seed Data (prisma/seed.ts)
- Demo customer: memberNo `100001`, password `123456` (mustChangePassword=true initially).
- Demo loan `L001`, installments, savings (compulsory/voluntary), events (group/village/global), one feedback.

## How to Run Backend Locally
1) `cd backend`
2) `npm install`
3) Create `.env` from `.env.example` and fill DB, JWT, ADMIN_API_KEY, MAIL_*, PAYMENT_*.
4) Prisma: `npx prisma migrate dev`, `npx prisma generate`, `npm run prisma:seed`
5) Start: `npm run start:dev` (port 3001)
6) Docs: http://localhost:3001/docs

## Notes
- Passwords numeric only (>=6). Temp passwords returned only in admin responses or emailed to staff.
- `/info` not implemented; frontend renders static content.
- Notification templates live at `src/modules/notifications/templates` (copied to dist by nest-cli assets config).
