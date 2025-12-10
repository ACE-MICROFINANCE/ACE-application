# ACE Farmer App – Project Overview

Full-stack setup for ACE Farmer (backend + web + mobile). This README is for new teammates to get productive quickly.

## Tech Stack
- **Backend**: NestJS 10, Prisma ORM (SQL Server), JWT (access + refresh), bcrypt, class-validator, Swagger.
- **Web**: Next.js 15 (App Router), Tailwind (custom UI wrappers), Axios with auth interceptors.
- **Mobile**: Expo React Native, React Navigation, NativeWind.

## Repository Structure
- `backend/`: NestJS API (modules: auth, admin, customers, loans, savings, events, feedback, dashboard, notifications), Prisma schema + migrations + seed, Swagger docs.
- `web/`: Next.js 15 App Router frontend (private routes under `/dashboard/*`, public auth pages).
- `mobile/`: Expo RN client (not covered here, similar API usage as web).

## Prerequisites
- Node.js 18+ and npm
- Git, VS Code (recommended)
- SQL Server instance with a database `ace_farmers`
- Optional: ngrok or Cloudflare Tunnel for exposing backend

## Environment Variables
### Backend `.env` (copy from `.env.example`)
```
DATABASE_URL=sqlserver://USER:PASSWORD@HOST:PORT;database=ace_farmers;encrypt=true
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_API_KEY=supersecretadminkey
PAYMENT_BANK_BIN=970415
PAYMENT_BANK_ACCOUNT_NO=1234567890
PAYMENT_BANK_ACCOUNT_NAME=ACE FARMER
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_mail@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM=your_mail@gmail.com
MAIL_TO=staff@ace.vn
FRONTEND_URL=http://localhost:3000   # or your tunnel URL
```

### Web `.env`
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001   # or backend tunnel URL
```

## Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run prisma:seed    # demo data: memberNo 100001, password 123456
npm run start:dev      # runs at 3001
# Swagger: http://localhost:3001/docs
```

## Web Setup
```bash
cd web
npm install
npm run dev    # runs at 3000
# for production: npm run build && npm run start
```

## Core Business Rules
- Login with numeric `memberNo` + numeric password (>= 6).
- Customer IDs (memberNo) and temporary passwords are created/provided by ACE staff; no self-registration.
- First login or admin reset sets `mustChangePassword=true` → FE forces change-password flow.
- Refresh tokens are stored hashed in DB; logout/rotate revokes old tokens.
- Temp passwords (6–8 digits) are only revealed to staff via email or admin API responses (never logged).
- VietQR payload built from PAYMENT_* envs; FE renders QR image.
- Information screen is frontend-only for now (no `/info` API).

## Key Backend Modules & Flows
- **Auth**: `/auth/login`, `/auth/refresh`, `/auth/change-password` (force mode skips old password), `/auth/logout`, `/auth/request-password-reset` (public, always returns success; generates temp password, sets mustChangePassword=true, emails staff).
- **Admin** (header `X-ADMIN-KEY`): `/admin/customers` (create customer, returns temp password), `/admin/customers/:id/reset-password` (returns new temp password).
- **Customers**: `/me` profile.
- **Loans**: `/loan/current` returns loan + `qrPayload { bankBin, accountNumber, accountName, description, amount }`.
- **Savings**: `/savings` (COMPULSORY/VOLUNTARY snapshots).
- **Events/Schedule**: `/schedule`, `/schedule/:id` with scope filtering.
- **Dashboard summary**: `/dashboard/summary` combines customer info, loan reminder, events, savings summary.
- **Feedback**: `/feedback` (store + email staff).
- **Notifications**: Nodemailer service with HTML templates in `src/modules/notifications/templates/*` (copied in build).

## Frontend (Web) Highlights
- Auth pages: `/login`, `/forgot-password`, `/change-password` (force vs normal mode).
- Private area `/dashboard`: cards for loan (with QR), savings, schedule, info, account (change password, feedback modal, contact CCO, logout).
- Axios client with interceptors for tokens; routes under `(private)` guard redirect to change-password if `mustChangePassword=true`.

## Running with Tunnels
- Align `FRONTEND_URL` (backend) with the actual web origin.
- Set `NEXT_PUBLIC_API_BASE_URL` to backend tunnel URL.
- Ensure CORS allows the frontend origin (handled via FRONTEND_URL).

## Deploy Notes (Render example)
- Root: repo root; set `Root Directory` to `backend/` if deploying only API.
- Build command: `cd backend && npm install && npm run build`
- Start command: `cd backend && npm run start`
- DB: use managed SQL Server; update `DATABASE_URL` accordingly.

## Troubleshooting
- “Could not find .next build” → run `npm run build` then `npm run start` (web).
- Email template not found → ensure `nest-cli.json` assets config and restart; NotificationService now searches both `dist/.../templates` and `src/.../templates`.
- SMTP errors → verify MAIL_*; request-password-reset will fail if transporter throws (logs show details).
- Force change-password loop → check `mustChangePassword` in customer credential and FE routing to `/change-password?mode=force`.

## Seed Data (prisma/seed.ts)
- Demo customer: memberNo `100001`, password `123456`.
- Demo loan `L001` with installments, savings (compulsory/voluntary), events (group/village/global), one feedback.
