# ACE Farmer App (Backend + Web + Mobile)

Full-stack authentication and dashboard experience for ACE Farmer customers. Stack includes NestJS + Prisma (SQL Server), Next.js 15 App Router web app, and Expo React Native mobile app. Customers are pre-created by staff; first-time login requires a password change.

## Repository layout
- `backend/` – NestJS API with Prisma + SQL Server, JWT auth, seed script.
- `web/` – Next.js 15 App Router UI with Tailwind, HeroUI, Framer Motion.
- `mobile/` – Expo React Native app with React Navigation and NativeWind.

## Backend (NestJS)
1) Install dependencies  
```bash
cd backend
npm install
```
2) Configure environment  
Copy `.env.example` to `.env` and fill SQL Server + JWT values.  
`DATABASE_URL` example: `sqlserver://USER:PASSWORD@HOST:PORT;database=ace_farmers;encrypt=true`

3) Prisma (SQL Server)  
```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed   # creates demo customers (temp password: 123456)
```

4) Start API  
```bash
npm run start:dev
```

5) Key endpoints  
- `POST /auth/login` – customerId + password (digits, min 6)  
- `POST /auth/change-password` – requires access token; clears mustChangePassword  
- `POST /auth/refresh` – refresh token from body  
- `GET /auth/me` – current customer  
- `POST /auth/forgot-password` – stub (501, under development)

## Web (Next.js 15)
1) Install dependencies  
```bash
cd web
npm install
```
2) Configure API URL via `.env`  
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```
3) Run dev server  
```bash
npm run dev
```

4) Auth rules (aligned with backend)  
- Login: customerId digits only; password digits only, min 6 chars.  
- Change password: old/new/confirm are digits, min 6.  
- Must-change-password flows redirect to `/change-password`.

5) UI structure  
- Auth: `/login`, `/change-password`, `/forgot-password` (UI notice).  
- Dashboard: `/dashboard` plus placeholders under `/dashboard/loan`, `/dashboard/saving`, `/dashboard/schedule`, `/dashboard/info`.  
- Bottom nav is shared across private pages via `(private)/layout.tsx` and uses icons from `public/img`.  
- Shared UI wraps HeroUI in `src/share/ui/*`; dashboard reminders use `DashboardInfoItem` and `DashboardRemindersCard`.

## Mobile (Expo)
1) Install dependencies  
```bash
cd mobile
npm install
```
2) Configure API URL  
Set `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001` (not localhost for device).

3) Start the app  
```bash
npm run start
```

4) Auth flow  
- Login with seeded `customerId` + temp password (123456).  
- If `mustChangePassword` is true, navigate to Change Password before tabs.  
- Other tabs currently show "under development".

## Notes
- No public registration; customers are seeded/admin-created.
- First-time login enforces password change (BE + FE).  
- Forgot password is stubbed on backend; UI shows notice.  
- Tokens stored client-side; Axios interceptors handle refresh on FE.  
- Icons/images reside in `web/public/img`.  
- Keep Tailwind + HeroUI usage through shared components; avoid direct imports in pages.
