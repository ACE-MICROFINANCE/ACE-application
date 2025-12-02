# ACE Farmer App (Backend + Web + Mobile)

Giải pháp fullstack cho khách hàng ACE Farmer. Công nghệ: NestJS + Prisma (SQL Server), Next.js 15 App Router, Expo React Native. Khách hàng do admin tạo; lần đầu đăng nhập bắt buộc đổi mật khẩu.

## Bạn cần cài gì (dành cho người không chuyên)
- **Node.js** (>=18) và npm: tải từ https://nodejs.org
- **SQL Server** (có thể dùng SQL Server Express)
- **Git** (để clone repo)
- **VS Code** (khuyên dùng)
- Tùy chọn: **ngrok/Cloudflare tunnel** nếu cần expose backend ra ngoài.

## Cấu trúc repo
- `backend/` – NestJS API + Prisma (SQL Server), JWT, seed script.
- `web/` – Next.js 15 App Router UI (Tailwind, HeroUI wrapper).
- `mobile/` – Expo React Native (React Navigation, NativeWind).

## Backend (NestJS)
1) Cài dependencies  
```bash
cd backend
npm install
```
2) Tạo file `.env` từ `.env.example`, điền:  
```
DATABASE_URL=sqlserver://USER:PASSWORD@HOST:PORT;database=ace_farmers;encrypt=true
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ADMIN_API_KEY=...
PAYMENT_BANK_BIN=970415
PAYMENT_BANK_ACCOUNT_NO=1234567890
PAYMENT_BANK_ACCOUNT_NAME=ACE FARMER
FRONTEND_URL=http://localhost:3000   # hoặc domain FE thực tế (ngrok/Cloudflare)
```
3) Prisma  
```bash
npx prisma migrate dev --name init
npx prisma generate
npm run prisma:seed   # tạo dữ liệu demo (mật khẩu 123456)
```
4) Chạy API  
```bash
npm run start:dev   # mặc định cổng 3001
```
5) Endpoints chính  
- `POST /auth/login` – memberNo + password (số, >=6)  
- `POST /auth/change-password`, `/auth/refresh`, `/me`  
- `GET /loan/current` – trả `qrPayload` VietQR từ PAYMENT_*  
- Admin: `POST /admin/customers`, `POST /admin/customers/:id/reset-password` (header `X-ADMIN-KEY`)  
- Swagger: `/docs`

## Web (Next.js 15)
1) Cài dependencies  
```bash
cd web
npm install
```
2) `.env` cho FE  
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001    # hoặc URL ngrok backend
```
3) Chạy dev  
```bash
npm run dev   # cổng 3000
```
4) Luồng chính  
- Login bằng memberNo + mật khẩu số (>=6); nếu `mustChangePassword=true` sẽ được chuyển sang `/change-password`.
- Trang private: `/dashboard` (loan, savings, schedule, info, account). QR VietQR hiển thị ở `/dashboard/loan`, có nút tải PNG.

## Mobile (Expo)
1) Cài dependencies  
```bash
cd mobile
npm install
```
2) API URL cho thiết bị  
```
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3001   # không dùng localhost trên thiết bị
```
3) Chạy app  
```bash
npm run start
```
Đăng nhập bằng tài khoản seed (memberNo + 123456), đổi mật khẩu nếu được yêu cầu.

## Notes
- Không có đăng ký công khai; khách hàng do admin tạo/seed.
- Lần đầu đăng nhập phải đổi mật khẩu (BE + FE).
- Nếu dùng ngrok/Cloudflare: FE trỏ `NEXT_PUBLIC_API_BASE_URL` vào URL backend; BE đặt `FRONTEND_URL` đúng domain FE để CORS cho phép.
- Ảnh/icon nằm ở `web/public/img`.
- Khi seed từ Excel, file nằm `backend/data/loan-import.xlsx`.
- Logs console sẽ in thông tin seed demo (memberNo/password).
