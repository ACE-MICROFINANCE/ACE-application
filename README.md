# ACE Farmer App - Project Overview

Full-stack setup for ACE Farmer (backend + web + mobile). This README is for new teammates to get productive quickly.

## Tech Stack
- Backend: NestJS 10, Prisma ORM (SQL Server), JWT (access + refresh), bcrypt, class-validator, Swagger.
- Web: Next.js 15 (App Router), Tailwind (custom UI wrappers), Axios with auth interceptors.
- Mobile: Expo React Native, React Navigation, NativeWind.

### Navigation / auth notes (mobile)
- Bottom tab layout remounts per role (customer vs staff vs admin) to avoid stale tabs when switching accounts. Logout clears profile cache before login.

## Repository Structure
- backend/: NestJS API (modules: auth, admin, customers, loans, savings, events, feedback, dashboard, notifications), Prisma schema + migrations + seed, Swagger docs.
- web/: Next.js 15 App Router frontend.
  - Customer pages: /dashboard/*
  - Staff pages: /staff/dashboard/*
  - Admin pages: /dashboard/admin/*
- mobile/: Expo RN client (Expo-managed).

### backend/ layout (high level)
- src/
  - modules/ (auth, admin, customers, loans, savings, events/schedule, feedback, notifications, dashboard)
  - common/ (guards/interceptors/utils)
  - config/ (env validation, configuration)
  - main.ts, app.module.ts
- prisma/ (schema.prisma, migrations/, seed.ts)
- docs/ (API/docs/notifications etc.)

### mobile/ layout (high level)
- src/
  - screens/ (CustomerScheduleScreen, StaffScheduleScreen, StaffCustomersScreen, StaffManageScreen, etc.)
  - navigation/ (TabBar, navigators)
  - components/ (ui, layout MobileFrame, forms)
  - lib/ (apiClient, tokenStore)
  - store/ (profile/auth stores)
  - theme/ (tokens)
- assets/ (images/icons)
- app.json, .env (Expo config)

## Prerequisites
- Node.js 18+ and npm
- Git, VS Code (recommended)
- SQL Server instance with a database ace_farmers
- Optional: ngrok or Cloudflare Tunnel for exposing backend

## Environment Variables
### Backend .env (copy from .env.example)
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
CUSTOMER_BOOTSTRAP_SYNC_ON_STARTUP=false
CUSTOMER_STARTUP_SYNC_MODE=unsynced_or_stale
CUSTOMER_STARTUP_SYNC_DELAY_SECONDS=20
CUSTOMER_STARTUP_SYNC_MAX_CUSTOMERS=300
CUSTOMER_WEEKLY_SYNC_ENABLED=true
CUSTOMER_WEEKLY_SYNC_DAY=6
CUSTOMER_WEEKLY_SYNC_HOUR=22
CUSTOMER_WEEKLY_SYNC_TIMEZONE=Asia/Bangkok
CUSTOMER_WEEKLY_SYNC_STALE_DAYS=7
CUSTOMER_WEEKLY_SYNC_MAX_CUSTOMERS=300
CUSTOMER_WEEKLY_SYNC_BATCH_SIZE=50
CUSTOMER_WEEKLY_SYNC_BATCH_DELAY_MS=150
```

- `CUSTOMER_BOOTSTRAP_SYNC_ON_STARTUP`:
  - `false` (mặc định): không chạy bootstrap sync khi backend khởi động.
  - `true`: chạy full bootstrap sync customer từ BIJLI lúc startup (có thể lâu với dữ liệu lớn).
- Startup sync (khi `CUSTOMER_BOOTSTRAP_SYNC_ON_STARTUP=true`) chạy nền, không chặn app start:
  - `CUSTOMER_STARTUP_SYNC_MODE`:
    - `unsynced_or_stale` (khuyến nghị): chỉ sync account chưa sync/stale.
    - `all`: sync toàn bộ customer.
  - `CUSTOMER_STARTUP_SYNC_DELAY_SECONDS`: delay bao nhiêu giây sau khi app up mới bắt đầu sync.
  - `CUSTOMER_STARTUP_SYNC_MAX_CUSTOMERS`: giới hạn số customer cho mode `unsynced_or_stale`.
- Weekly customer sync (mặc định bật, chạy nền để hệ thống vẫn hoạt động):
  - `CUSTOMER_WEEKLY_SYNC_ENABLED=true`: bật/tắt sync định kỳ.
  - `CUSTOMER_WEEKLY_SYNC_DAY`: ngày chạy (0=CN, 1=T2, ..., 6=T7). Mặc định `6` (Thứ 7).
  - `CUSTOMER_WEEKLY_SYNC_HOUR`: giờ chạy 0-23 theo timezone bên dưới. Mặc định `22`.
  - `CUSTOMER_WEEKLY_SYNC_TIMEZONE`: timezone chạy lịch. Mặc định `Asia/Bangkok`.
  - `CUSTOMER_WEEKLY_SYNC_STALE_DAYS`: chỉ sync account chưa từng sync hoặc đã cũ hơn N ngày. Mặc định `7`.
  - `CUSTOMER_WEEKLY_SYNC_MAX_CUSTOMERS`: giới hạn số customer mỗi lần chạy để tránh tải cao.
  - `CUSTOMER_WEEKLY_SYNC_BATCH_SIZE`: số customer mỗi batch.
  - `CUSTOMER_WEEKLY_SYNC_BATCH_DELAY_MS`: nghỉ giữa các batch (ms), giúp giảm áp lực hệ thống.

### Web .env
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

## Roles and Access
- CUSTOMER: memberNo + password; thấy dashboard khách hàng (loan, savings, schedule, info, account).
- STAFF:
  - BA (Branch Assistant): tạo/cập nhật lịch chi nhánh; không duyệt/ẩn.
  - BM (Branch Manager): duyệt/từ chối/ẩn/bỏ ẩn lịch chi nhánh.
- ADMIN: quản lý staff users/branches.
- SUPER_ADMIN: quản lý admin accounts (Admin Manager), chỉ 2 tab (AdminManager, Account) trên mobile.

### Lịch / Schedule (staff)
- Trạng thái DB: PENDING_APPROVAL, APPROVED, REJECTED, UPDATED; hidden (boolean); EXPIRED, HIDDEN là derived cho UI.
- BA nhìn thấy: PENDING_APPROVAL, APPROVED, UPDATED (hiển thị như “Chờ duyệt”), REJECTED trong 24h; không thấy HIDDEN/EXPIRED.
- BM nhìn thấy tất cả, có badge “Ẩn” nếu hidden.
- BM actions: POST /events/:id/approve, /reject, /hide { hidden }.
- BA update lịch đã duyệt sẽ thành UPDATED (BM sẽ thấy “Đã chỉnh sửa”).
- Sort GET /events: theo thời gian bắt đầu hiệu dụng DESC, rồi updatedAt DESC, rồi id DESC (FE không tự sort lại).

## Accessibility (Trợ năng)
- Mobile: Staff can toggle “Trợ năng” per customer in StaffCustomersScreen; when enabled, app surfaces accessibility-friendly flows (e.g., simplified navigation, voice-friendly prompts – pending UX work) for that customer’s account.
- Backend: Accessibility flag is stored on the customer record and can be toggled via staff API (setCustomerAccessibilityForStaff); value is returned in /me and staff customer detail endpoints so mobile can render the toggle and adapt UI.

## Recent Changes (Jan 2026)
- Thêm SUPER_ADMIN và Admin Manager (mobile) để tạo/xóa ADMIN.
- Chuẩn hóa role staff thành BA/BM; lịch/states PENDING_APPROVAL/APPROVED/REJECTED/UPDATED, hidden toggle; sort theo thời gian (DESC); REJECTED hiển thị BA ≤24h.
- Mobile staff schedule: badge theo role, BM có duyệt/từ chối/ẩn, BA chỉ tạo/sửa; “Thông báo” không yêu cầu thời lượng.

## Core Business Rules
- Single login endpoint: POST /auth/login accepts { identifier, password }.
  - identifier contains '@' => staff/admin login
  - otherwise => customer login
- Customer IDs (memberNo) and temporary passwords are created/provided by ACE staff; no self-registration.
- First login or admin reset sets mustChangePassword=true -> FE forces change-password flow.
- Refresh tokens are stored hashed in DB; logout/rotate revokes old tokens.
- Temp passwords (6-8 digits) are only revealed to staff via email or admin API responses (never logged).
- VietQR payload built from PAYMENT_* envs; FE renders QR image.
- Information screen is frontend-only for now (no /info API).

## Key Backend Modules and Flows
- Auth: /auth/login, /auth/refresh, /auth/change-password (force mode skips old password), /auth/logout, /auth/request-password-reset.
- Admin (header X-ADMIN-KEY): /admin/customers, /admin/customers/:id/reset-password.
- Staff users (admin only): /staff-users (list/create/update/delete/lock/reset), /staff-users/branches.
- Staff groups (branch manager): /staff/groups (group list by branch).
- Customers: /me profile (returns customer or staff profile based on actorKind).
- Loans: /loan/current returns loan + qrPayload { bankBin, accountNumber, accountName, description, amount }.
- Savings: /savings (COMPULSORY/VOLUNTARY snapshots and transaction history).
- Events/Schedule:
  - Staff CRUD: /events (create/update/delete/list)
  - Customer list: /events/my (filtered by branch and group)
  - Unified schedule: /schedule, /schedule/:id (actor-aware)
- Feedback: /feedback (store + email staff).
- Notifications: Nodemailer service with HTML templates in src/modules/notifications/templates/* (copied in build).

## Branch and Group Mapping
- Static mapping file: backend/src/branch-group-map.json
- Used to infer groupCode, branchCode, and branchName from BIJLI GroupName during sync.
- Customer records persist branchCode and branchName for schedule filtering.

## Debug and Sync Tools
- Admin debug endpoints:
  - POST /admin/debug/members/:memberNo/refresh
  - GET /admin/debug/members/:memberNo
  - GET /admin/debug/customers/sync-candidates?staleDays=7&limit=100
  - POST /admin/debug/customers/sync-now?staleDays=7&maxCustomers=300
- Use for internal testing only; keep disabled in production.

## Frontend (Web) Highlights
- Auth pages: /login, /forgot-password, /change-password (force vs normal mode).
- Customer area: /dashboard (loan, savings, schedule, info, account).
- Staff area: /staff/dashboard/schedule (create/edit schedules for their branch).
- Admin area: /dashboard/admin/staff-management (manage staff users).
- Axios client with interceptors for tokens; routes under (private) guard redirect to /change-password?mode=force if mustChangePassword=true.
- iOS-safe modals: change-password and staff/admin sheets use keyboard-safe scroll helpers.

## Documentation
- BACKEND_API_DOCS.md
- docs/rbac-auth-events.md
- STAFF_MANAGEMENT_API.md

## Running with Tunnels
- Align FRONTEND_URL (backend) with the actual web origin.
- Set NEXT_PUBLIC_API_BASE_URL to backend tunnel URL.
- Ensure CORS allows the frontend origin (handled via FRONTEND_URL).

## Deploy Notes (Render example)
- Root: repo root; set Root Directory to backend/ if deploying only API.
- Build command: cd backend && npm install && npm run build
- Start command: cd backend && npm run start
- DB: use managed SQL Server; update DATABASE_URL accordingly.

## Troubleshooting
- "Could not find .next build" -> run npm run build then npm run start (web).
- Email template not found -> ensure nest-cli.json assets config and restart; NotificationService searches both dist/.../templates and src/.../templates.
- SMTP errors -> verify MAIL_*; request-password-reset fails if transporter throws (check logs).
- Force change-password loop -> check mustChangePassword in customer credential and FE routing to /change-password?mode=force.

## Seed Data (prisma/seed.ts)
- Demo customer: memberNo 100001, password 123456.
- Demo loan L001 with installments, savings (compulsory/voluntary), events, one feedback.
